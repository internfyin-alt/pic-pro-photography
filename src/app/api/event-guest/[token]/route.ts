import { z } from 'zod';
import { consentVersion, guestSessionMinutes, maxSelfieBytes, originalBucket, photoMimeTypes } from '@/lib/event-photos/constants';
import { matchSelfie } from '@/lib/event-photos/recognition';
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
]);

async function limit(db: PhotoDb, scope: string, minutes: number, maximum: number) {
  const allowed = dbResult(await db.rpc('consume_photo_limit', {
    p_scope: scope, p_bucket: Math.floor(Date.now() / (minutes * 60_000)), p_limit: maximum,
  }));
  if (!allowed) throw new PhotoError('Too many attempts right now. Please try again later.', 429);
}

async function search(request: Request, token: string, db: PhotoDb) {
  const contentLength = Number(request.headers.get('content-length'));
  if (contentLength > maxSelfieBytes + 16_384) throw new PhotoError('Choose a selfie under 3 MB.', 413);
  const event = await sharedEvent(db, token);
  const source = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || 'unknown';
  await limit(db, 'guest:' + hashToken(token + ':' + source.split(',')[0]), 1, 5);
  await limit(db, 'event:' + event.id, 1, 120);
  const form = await request.formData();
  const selfie = form.get('selfie');
  if (form.get('consent') !== consentVersion) throw new PhotoError('Review and accept the consent before searching.');
  if (!(selfie instanceof File) || selfie.size === 0 || selfie.size > maxSelfieBytes || !photoMimeTypes.includes(selfie.type)) {
    throw new PhotoError('Choose a JPG, PNG or WebP selfie under 3 MB.');
  }

  const ids = await matchSelfie(event.id, await selfie.arrayBuffer());
  await sharedEvent(db, token);
  const photos = ids.length ? dbRequired(await db.from('event_photos')
    .select('id,file_name,byte_size,storage_path').eq('event_id', event.id).eq('status', 'ready').in('id', ids)) : [];
  const session = secretToken();
  const expiresAt = new Date(Date.now() + guestSessionMinutes * 60_000).toISOString();
  dbResult(await db.from('photo_guest_sessions').insert({
    token_hash: hashToken(session), event_id: event.id, consent_version: consentVersion,
    photo_ids: photos.map(photo => photo.id), expires_at: expiresAt,
  }));
  await audit(db, 'guest.search', event.id, undefined, photos.length);
  const previews = photos.length ? dbRequired(await db.storage.from(originalBucket)
    .createSignedUrls(photos.map(photo => previewPath(photo.storage_path)), 60)) : [];
  const urls = new Map(previews.map(preview => [preview.path, preview.signedUrl]));
  return photoJson({
    session, expiresAt,
    photos: photos.map(photo => ({ id: photo.id, name: photo.file_name, size: photo.byte_size, previewUrl: urls.get(previewPath(photo.storage_path)) })),
  });
}

export async function POST(request: Request, { params }: Context) {
  try {
    const token = (await params).token;
    const db = photoDb();
    if (request.headers.get('content-type')?.startsWith('multipart/form-data')) return await search(request, token, db);
    const parsed = guestAction.safeParse(await request.json());
    if (!parsed.success || !validToken(parsed.data.session)) throw new PhotoError('Invalid session.');
    const input = parsed.data;
    const tokenHash = hashToken(input.session);

    if (input.action === 'clear') {
      dbResult(await db.from('photo_guest_sessions').delete().eq('token_hash', tokenHash));
      return photoJson({ ok: true });
    }

    const event = await sharedEvent(db, token);
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
