import { after } from 'next/server';
import { z } from 'zod';
import { consentVersion, guestRegistrationDays, guestSessionMinutes, maxSelfieBytes, originalBucket, photoMimeTypes, whatsappConsentVersion } from '@/lib/event-photos/constants';
import { prepareRegistrationSelfie, readyGuestMatches } from '@/lib/event-photos/recognition';
import { guestRegistrationHash, sendPendingWhatsApp, whatsappNotificationsEnabled } from '@/lib/event-photos/whatsapp';
import {
  audit, dbRequired, dbResult, hashToken, photoDb, PhotoError, photoFailure, photoJson, previewPath, secretToken,
  sharedEvent, signedPhoto, type EventPhoto, type PhotoDb, validToken,
} from '@/lib/event-photos/server';

export const maxDuration = 30;
type Context = { params: Promise<{ token: string }> };

const guestAction = z.discriminatedUnion('action', [
  z.object({ action: z.literal('preview'), session: z.string(), photoId: z.string().uuid() }),
  z.object({ action: z.literal('download'), session: z.string(), photoId: z.string().uuid() }),
  z.object({ action: z.literal('batch'), session: z.string(), photoIds: z.array(z.string().uuid()).min(1).max(100) }),
  z.object({ action: z.literal('clear'), session: z.string() }),
  z.object({ action: z.literal('find'), accessKey: z.string() }),
  z.object({ action: z.literal('forget'), accessKey: z.string() }),
]);

const guestName = z.string().trim().min(1).max(100);

const guestPhone = z.string().trim().max(24).regex(/^\+?[\d ()-]+$/)
  .refine(phone => /^\d{7,15}$/.test(phone.replace(/\D/g, '')));

const legacyRegistrationColumn = /null value in column "(?:location|relationship)"/i;

async function limit(db: PhotoDb, scope: string, minutes: number, maximum: number) {
  const allowed = dbResult(await db.rpc('consume_photo_limit', {
    p_scope: scope, p_bucket: Math.floor(Date.now() / (minutes * 60_000)), p_limit: maximum,
  }));
  if (!allowed) throw new PhotoError('Too many attempts right now. Please try again later.', 429);
}

async function register(request: Request, token: string, db: PhotoDb) {
  const contentLength = Number(request.headers.get('content-length'));
  if (contentLength > maxSelfieBytes + 16_384) throw new PhotoError('Choose a selfie under 3 MB.', 413);
  const event = await sharedEvent(db, token);
  const source = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || 'unknown';
  await limit(db, 'register:' + hashToken(token + ':' + source.split(',')[0]), 1, 20);
  await limit(db, 'register-event:' + event.id, 1, 120);
  const form = await request.formData();
  const selfie = form.get('selfie');
  if (form.get('consent') !== consentVersion) throw new PhotoError('Review and accept the consent before registering.');
  const name = guestName.safeParse(form.get('name'));
  if (!name.success) throw new PhotoError('Enter your name.');
  const phone = guestPhone.safeParse(form.get('phone'));
  if (!phone.success) throw new PhotoError('Enter a valid WhatsApp number.');
  const notify = form.get('whatsappConsent') === whatsappConsentVersion;
  const whatsappPhone = phone.data.replace(/[\s()-]/g, '');
  if (notify && !/^[+][1-9]\d{6,14}$/.test(whatsappPhone)) {
    throw new PhotoError('Enter your WhatsApp number with a + and country code to get an alert.');
  }
  if (notify && !whatsappNotificationsEnabled()) {
    throw new PhotoError('WhatsApp alerts are temporarily unavailable. Uncheck the alert to continue.');
  }
  if (!(selfie instanceof File) || selfie.size === 0 || selfie.size > maxSelfieBytes || !photoMimeTypes.includes(selfie.type)) {
    throw new PhotoError('Choose a JPG, PNG or WebP selfie under 3 MB.');
  }

  const bytes = await prepareRegistrationSelfie(await selfie.arrayBuffer());
  const current = await sharedEvent(db, token);
  const accessKey = secretToken();
  const expiresAt = new Date(Date.now() + guestRegistrationDays * 86_400_000).toISOString();
  const registration = {
    token_hash: hashToken(accessKey), event_id: current.id, guest_name: name.data, phone: notify ? whatsappPhone : phone.data,
    selfie_jpeg: '\\x' + bytes.toString('hex'), consent_version: consentVersion, expires_at: expiresAt,
    ...(notify && { whatsapp_opted_in_at: new Date().toISOString(), whatsapp_next_attempt_at: new Date().toISOString() }),
  };
  const registrations = db.from('photo_guest_registrations');
  let saved = await registrations.insert(registration);
  if (saved.error?.code === '23502' && legacyRegistrationColumn.test(saved.error.message)) {
    // Databases awaiting the migration still require these columns. Store no guest data in them.
    saved = await registrations.insert({ ...registration, location: '', relationship: '' });
  }
  if (saved.error) {
    console.error('Guest registration insert failed:', saved.error.code);
    throw new PhotoError('We could not save your registration. Please try again later.', 502);
  }
  if (notify) after(() => sendPendingWhatsApp(db, Date.now() + 8_000, current.id));
  return photoJson({ accessKey, expiresAt }, 201);
}

async function find(db: PhotoDb, token: string, registrationHash: string) {
  const event = await sharedEvent(db, token);
  const registration = dbResult(await db.from('photo_guest_registrations').select('expires_at')
    .eq('event_id', event.id).eq('token_hash', registrationHash).gt('expires_at', new Date().toISOString()).maybeSingle());
  if (!registration) throw new PhotoError('This personal link has expired or was removed. Scan the event QR to register again.', 404);
  await limit(db, 'registered-guest:' + registrationHash, 1, 5);
  await limit(db, 'event:' + event.id, 1, 120);
  const ready = dbRequired(await db.from('event_photos').select('id').eq('event_id', event.id).eq('status', 'ready').limit(1));
  if (!ready.length) return photoJson({ status: 'waiting', registrationExpiresAt: registration.expires_at });

  const saved = dbResult(await db.from('photo_guest_registrations').select('selfie_jpeg')
    .eq('event_id', event.id).eq('token_hash', registrationHash).gt('expires_at', new Date().toISOString()).maybeSingle());
  if (!saved) throw new PhotoError('This personal link has expired or was removed.', 404);
  const photos = await readyGuestMatches(db, event.id, saved.selfie_jpeg);
  await sharedEvent(db, token);
  const session = secretToken();
  const now = Date.now();
  const registrationExpiry = Date.parse(registration.expires_at);
  if (registrationExpiry <= now) throw new PhotoError('This personal link has expired.', 404);
  const expiresAt = new Date(Math.min(registrationExpiry, now + guestSessionMinutes * 60_000)).toISOString();
  dbResult(await db.from('photo_guest_sessions').insert({
    token_hash: hashToken(session), event_id: event.id, consent_version: consentVersion,
    photo_ids: photos.map(photo => photo.id), expires_at: expiresAt, registration_token_hash: registrationHash,
  }));
  await audit(db, 'guest.search', event.id, undefined, photos.length);
  const previews = photos.length ? dbRequired(await db.storage.from(originalBucket)
    .createSignedUrls(photos.map(photo => previewPath(photo.storage_path)), 60)) : [];
  const urls = new Map(previews.map(preview => [preview.path, preview.signedUrl]));
  return photoJson({
    status: 'found', session, expiresAt, registrationExpiresAt: registration.expires_at,
    photos: photos.map(photo => ({ id: photo.id, name: photo.file_name, size: photo.byte_size, previewUrl: urls.get(previewPath(photo.storage_path)) })),
  });
}

export async function POST(request: Request, { params }: Context) {
  try {
    const token = (await params).token;
    const db = photoDb();
    if (request.headers.get('content-type')?.startsWith('multipart/form-data')) return await register(request, token, db);
    const parsed = guestAction.safeParse(await request.json());
    if (!parsed.success) throw new PhotoError('Invalid request.');
    const input = parsed.data;
    if (input.action === 'find' || input.action === 'forget') {
      const registrationHash = guestRegistrationHash(token, input.accessKey);
      if (!registrationHash) throw new PhotoError('Invalid personal link.');
      if (input.action === 'find') return await find(db, token, registrationHash);
      const event = dbResult(await db.from('photo_events').select('id').eq('share_token', token).maybeSingle());
      if (event) dbResult(await db.from('photo_guest_registrations').delete()
        .eq('token_hash', registrationHash).eq('event_id', event.id));
      return photoJson({ ok: true });
    }
    if (!validToken(input.session)) throw new PhotoError('Invalid session.');
    const tokenHash = hashToken(input.session);

    if (input.action === 'clear') {
      dbResult(await db.from('photo_guest_sessions').delete().eq('token_hash', tokenHash));
      return photoJson({ ok: true });
    }

    const event = await sharedEvent(db, token);
    if (event.guest_downloads_enabled === false && (input.action === 'download' || input.action === 'batch')) {
      throw new PhotoError('Photo downloads are disabled for this gallery.', 403);
    }
    const { photo_ids: allowedIds = [] } = dbResult(await db.from('photo_guest_sessions').select('photo_ids')
      .eq('event_id', event.id).eq('token_hash', tokenHash).gt('expires_at', new Date().toISOString()).maybeSingle()) ?? {};
    if (!allowedIds.length) throw new PhotoError('This photo search has expired. Take a new selfie to continue.', 401);
    await limit(db, 'delivery:' + tokenHash, 1, 180);
    const ids = input.action === 'batch' ? [...new Set(input.photoIds)] : [input.photoId];
    const allowed = new Set<string>(allowedIds);
    if (ids.some(id => !allowed.has(id))) throw new PhotoError('Photo unavailable.', 404);
    const photos = dbResult(await db.from('event_photos').select('*').eq('event_id', event.id)
      .eq('status', 'ready').in('id', ids)) as EventPhoto[];
    if (!photos.length) throw new PhotoError('Photo unavailable.', 404);

    if (input.action === 'batch') {
      const entries = dbRequired(await db.storage.from(originalBucket).createSignedUrls(photos.map(photo => photo.storage_path), 60));
      const urls = new Map(entries.map(entry => [entry.path, entry.signedUrl]));
      const files = photos.flatMap(photo => {
        const url = urls.get(photo.storage_path);
        return url ? [{ id: photo.id, name: photo.file_name, url }] : [];
      });
      await audit(db, 'guest.download_requested', event.id, undefined, files.length);
      return photoJson({ files });
    }
    if (input.action === 'download') await audit(db, 'guest.download_requested', event.id, undefined, 1);
    return photoJson({ url: await signedPhoto(db, photos[0], input.action === 'download') });
  } catch (error) {
    return photoFailure(error);
  }
}
