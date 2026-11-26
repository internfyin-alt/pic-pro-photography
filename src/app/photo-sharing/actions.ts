'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AuthError } from '@supabase/supabase-js';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase';
import { audit, dbRequired, dbResult, photoActor, photoDb, PhotoError, requestUrl, secretToken, validId } from '@/lib/event-photos/server';

const credentials = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

function photographerAuthStatus(error: AuthError, signup: boolean) {
  switch (error.code) {
    case 'email_not_confirmed': return 'unconfirmed';
    case 'invalid_credentials': return 'credentials';
    case 'weak_password': return 'weak-password';
    case 'email_address_invalid': return 'invalid-email';
    case 'email_address_not_authorized': return 'email-restricted';
    case 'email_provider_disabled':
    case 'signup_disabled': return 'signup-disabled';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit': return 'rate-limited';
    case 'email_exists':
    case 'user_already_exists': return 'signup-failed';
    default:
      console.warn('Photographer auth request failed', {
        operation: signup ? 'signup' : 'login',
        code: error.code,
        status: error.status,
        type: error.name,
      });
      return error.name === 'AuthRetryableFetchError' ? 'unavailable' : signup ? 'signup-failed' : 'login-failed';
  }
}

export async function photographerAuth(form: FormData) {
  const signup = form.get('intent') === 'register';
  const back = signup ? '/photo-sharing/register' : '/photo-sharing/login';
  const parsed = credentials.safeParse({ email: form.get('email'), password: form.get('password') });
  if (!parsed.success) redirect(back + '?status=invalid');
  const name = z.string().trim().min(2).max(100).safeParse(form.get('name'));

  try {
    photoDb();
  } catch {
    redirect(back + '?status=setup');
  }
  const supabase = await supabaseServer();
  if (signup) {
    if (!name.success) redirect(back + '?status=invalid');
    if (parsed.data.password.length < 8) redirect(back + '?status=weak-password');
    const { data, error } = await supabase.auth.signUp({
      ...parsed.data,
      options: {
        data: { photographer_name: name.data },
      },
    });
    if (error) redirect(back + '?status=' + photographerAuthStatus(error, true));
    if (!data.session) {
      const login = await supabase.auth.signInWithPassword(parsed.data);
      if (login.error) {
        redirect(back + '?status=' + photographerAuthStatus(login.error, false));
      }
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) redirect(back + '?status=' + photographerAuthStatus(error, false));
  }
  redirect('/photo-sharing/studio');
}

export async function createPhotographer(form: FormData) {
  const name = z.string().trim().min(2).max(100).safeParse(form.get('name'));
  if (!name.success) redirect('/photo-sharing/studio?status=invalid');
  try {
    const { db, user, owner } = await photoActor();
    if (!owner) {
      dbResult(await db.from('photo_photographers').upsert(
        { id: user.id, email: user.email, name: name.data }, { onConflict: 'id', ignoreDuplicates: true },
      ));
      await audit(db, 'photographer.registered', undefined, user.id);
    }
  } catch {
    redirect('/photo-sharing/studio?status=failed');
  }
  redirect('/photo-sharing/studio');
}

export async function updatePhotographer(form: FormData) {
  const name = z.string().trim().min(2).max(100).safeParse(form.get('name'));
  if (!name.success) redirect('/photo-sharing/studio?view=profile&status=invalid');
  try {
    const { db, user, owner } = await photoActor();
    if (owner) dbResult(await db.from('photo_photographers').update({ name: name.data, email: user.email }).eq('id', user.id));
  } catch {
    redirect('/photo-sharing/studio?view=profile&status=failed');
  }
  redirect('/photo-sharing/studio?view=profile&status=saved');
}

export async function photographerLogout() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect('/photo-sharing');
}

export async function setAllEventsSharing(form: FormData) {
  const back = '/photo-sharing/studio?view=qr';
  const setting = form.get('enabled');
  if (setting !== 'true' && setting !== 'false') redirect(back + '&status=all-events-failed');

  try {
    const { db, user, owner } = await photoActor();
    if (!owner || owner.suspended || owner.deleted_at) throw new PhotoError('Photographer access required.', 403);

    const enabled = setting === 'true';
    const initialize = enabled && !owner.all_events_share_token;
    const update = db.from('photo_photographers').update(initialize
      ? { all_events_sharing_enabled: true, all_events_share_token: secretToken() }
      : { all_events_sharing_enabled: enabled },
    ).eq('id', user.id).eq('suspended', false).is('deleted_at', null);
    // Concurrent first-time requests must reuse the token written by the first update.
    dbResult(await (initialize ? update.is('all_events_share_token', null) : update));
  } catch (error) {
    if (error instanceof PhotoError && error.status === 401) redirect('/photo-sharing/login');
    redirect(back + '&status=all-events-failed');
  }
  redirect(back);
}

export async function setPhotographerStatus(form: FormData) {
  const { db, user } = await photoActor(true);
  const id = String(form.get('id'));
  if (!validId(id)) redirect('/admin/photo-sharing');
  const suspended = form.get('suspended') === 'true';
  const updated = dbResult(await db.from('photo_photographers').update({ suspended })
    .eq('id', id).is('deleted_at', null).select('id').maybeSingle());
  if (!updated) redirect('/admin/photo-sharing');
  if (suspended) {
    const events = dbRequired(await db.from('photo_events').select('id').eq('owner_id', id));
    if (events.length) dbResult(await db.from('photo_guest_sessions').delete().in('event_id', events.map(event => event.id)));
  }
  await audit(db, suspended ? 'photographer.suspended' : 'photographer.activated', undefined, user.id, undefined, id);
  redirect('/admin/photo-sharing');
}

export async function deletePhotographer(form: FormData) {
  const { db, user } = await photoActor(true);
  const id = String(form.get('id'));
  const page = Number(form.get('page'));
  const back = Number.isInteger(page) && page > 1 && page <= 10_000
    ? '/admin/photo-sharing?page=' + page + '&'
    : '/admin/photo-sharing?';
  if (!validId(id)) redirect(back + 'status=delete-failed');

  let status = 'deleted';
  try {
    const profile = dbResult(await db.from('profiles').select('role').eq('id', id).maybeSingle());
    if (profile?.role === 'admin') {
      status = 'admin-protected';
    } else {
      const removed = dbResult(await db.from('photo_photographers')
        .update({ deleted_at: new Date().toISOString(), suspended: true })
        .eq('id', id).is('deleted_at', null).select('id').maybeSingle());
      if (removed) await audit(db, 'photographer.deleted', undefined, user.id, undefined, id);
      else status = 'already-removed';
    }
  } catch {
    status = 'delete-failed';
  }
  redirect(back + 'status=' + status);
}

export async function setGuestAccess(form: FormData) {
  const { db, user } = await photoActor(true);
  const enabled = form.get('enabled') === 'true';
  dbResult(await db.from('photo_platform_settings').update({ guest_access: enabled }).eq('singleton', true));
  if (!enabled) dbResult(await db.from('photo_guest_sessions').delete().not('token_hash', 'is', null));
  await audit(db, enabled ? 'platform.sharing_enabled' : 'platform.sharing_paused', undefined, user.id);
  redirect('/admin/photo-sharing');
}

export async function requestPasswordReset(form: FormData) {
  const email = z.string().trim().email().max(254).safeParse(form.get('email'));
  if (!email.success) redirect('/photo-sharing/reset?status=invalid');
  const db = await supabaseServer();
  const origin = (await headers()).get('origin') ?? undefined;
  await db.auth.resetPasswordForEmail(email.data, { redirectTo: requestUrl('/photo-sharing/verify?flow=recovery', origin) });
  redirect('/photo-sharing/reset?status=sent');
}

export async function changePassword(form: FormData) {
  const password = z.string().min(8).max(128).safeParse(form.get('password'));
  if (!password.success || password.data !== form.get('confirmation')) redirect('/photo-sharing/reset?mode=change&status=invalid');
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/photo-sharing/reset?status=invalid');
  const { error } = await db.auth.updateUser({ password: password.data });
  if (error) redirect('/photo-sharing/reset?mode=change&status=failed');
  await db.auth.signOut();
  redirect('/photo-sharing/login?status=reset');
}
