import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { originalBucket } from './constants';

export type PhotoEvent = {
  id: string;
  owner_id: string;
  title: string;
  event_type: string;
  event_date: string | null;
  share_token: string;
  sharing_enabled: boolean;
  deleting: boolean;
  created_at: string;
};

export type EventPhoto = {
  id: string;
  event_id: string;
  storage_path: string;
  file_name: string;
  byte_size: number;
  status: string;
  face_count: number;
  index_attempted: boolean;
  error: string | null;
  created_at: string;
  job_token: string | null;
};

export class PhotoError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export function photoDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new PhotoError('Event photo sharing is awaiting database setup.', 503);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type PhotoDb = ReturnType<typeof photoDb>;

export const secretToken = () => randomBytes(24).toString('hex');
export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
export const validToken = (value: string) => /^[a-f0-9]{48}$/.test(value);
export const validId = (value: string) => /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value);
export const previewPath = (path: string) => path + '.preview.jpg';

export function dbResult<T>(
  result: { data: T; error: { message: string } | null },
  message = 'Unable to complete the request.',
): T {
  if (result.error) {
    console.error('Event photo database request failed:', result.error.message);
    throw new PhotoError(message, 502);
  }
  return result.data;
}

export function dbRequired<T>(result: { data: T; error: { message: string } | null }, message?: string) {
  const data = dbResult(result, message);
  if (data == null) throw new PhotoError(message ?? 'No data was returned.', 502);
  return data;
}

export async function photoActor(adminOnly = false) {
  const db = photoDb();
  const auth = await supabaseServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user?.email) throw new PhotoError('Sign in to continue.', 401);
  const [profileQuery, ownerQuery] = await Promise.all([
    db.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    db.from('photo_photographers').select('*').eq('id', user.id).maybeSingle(),
  ]);
  const profile = dbResult(profileQuery);
  const admin = profile?.role === 'admin';
  if (adminOnly && !admin) throw new PhotoError('Admin access required.', 403);

  const owner = dbResult(ownerQuery);
  if (owner?.deleted_at && !admin) throw new PhotoError('Your photographer account was removed.', 403);
  if (owner?.suspended && !admin) throw new PhotoError('Your photographer account is suspended.', 403);
  return { db, user, admin, owner };
}

export async function ownedEvent(db: PhotoDb, id: string, userId: string, admin: boolean) {
  if (!validId(id)) throw new PhotoError('Event unavailable.', 404);
  let query = db.from('photo_events').select('*').eq('id', id);
  if (!admin) query = query.eq('owner_id', userId);
  const event = dbResult(await query.maybeSingle()) as PhotoEvent | null;
  if (!event) throw new PhotoError('Event unavailable.', 404);
  return event;
}

export async function sharedEvent(db: PhotoDb, token: string) {
  if (!validToken(token)) throw new PhotoError('This event link is unavailable.', 404);
  const [settingsQuery, eventQuery] = await Promise.all([
    db.from('photo_platform_settings').select('guest_access').single(),
    db.from('photo_events').select('*')
      .eq('share_token', token).eq('sharing_enabled', true).eq('deleting', false).maybeSingle(),
  ]);
  const settings = dbRequired(settingsQuery);
  if (!settings.guest_access) throw new PhotoError('Guest photo sharing is temporarily paused.', 503);
  const event = dbResult(eventQuery) as PhotoEvent | null;
  if (!event) throw new PhotoError('This event link is unavailable.', 404);
  const owner = dbResult(await db.from('photo_photographers').select('suspended').eq('id', event.owner_id).maybeSingle());
  if (!owner || owner.suspended) throw new PhotoError('This event link is unavailable.', 404);
  return event;
}

export async function audit(db: PhotoDb, action: string, eventId?: string, actorId?: string, count?: number, subjectId?: string) {
  const { error } = await db.from('photo_audit').insert({
    action, event_id: eventId, actor_id: actorId, result_count: count, subject_id: subjectId,
  });
  if (error) console.error('Unable to record photo activity:', error.code);
}

export function photoJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function photoFailure(error: unknown) {
  if (error instanceof PhotoError) return photoJson({ error: error.message }, error.status);
  if (error instanceof SyntaxError) return photoJson({ error: 'Invalid request.' }, 400);
  console.error('Unexpected event photo error:', error instanceof Error ? error.name : 'Unknown');
  return photoJson({ error: 'Unable to complete the request.' }, 500);
}

export async function signedPhoto(db: PhotoDb, photo: EventPhoto, download = false) {
  const result = dbRequired(await db.storage.from(originalBucket).createSignedUrl(
    download || photo.status !== 'ready' ? photo.storage_path : previewPath(photo.storage_path),
    60, download ? { download: photo.file_name } : {},
  ), 'Photo unavailable.');
  return result.signedUrl;
}

export function requestUrl(path: string, origin?: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || origin || 'http://localhost:3000';
  return new URL(path, base).toString();
}
