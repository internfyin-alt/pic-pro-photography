import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { maxPhotoBytes, originalBucket, photoMimeTypes, photoPageSize, photoReviewFilters } from '@/lib/event-photos/constants';
import { eventDetails, gallerySettings, gallerySettingsFields } from '@/lib/event-photos/validation';
import { processNextPhoto, removeEventCollection, removePhotoFaces } from '@/lib/event-photos/recognition';
import {
  audit, dbRequired, dbResult, ownedEvent, photoActor, photoFailure, photoJson, PhotoError, previewPath,
  secretToken, signedPhoto, type EventPhoto, validId,
} from '@/lib/event-photos/server';

export const maxDuration = 60;
type Context = { params: Promise<{ id: string }> };
const controls = z.discriminatedUnion('action', [
  eventDetails.extend(gallerySettings.shape).extend({ action: z.literal('details') }),
  z.object({ action: z.literal('sharing'), enabled: z.boolean() }),
  z.object({ action: z.literal('rotate') }),
  z.object({ action: z.literal('reserve'), name: z.string().trim().min(1).max(200), size: z.number().int().positive().max(maxPhotoBytes), type: z.string().refine(type => photoMimeTypes.includes(type)) }),
  z.object({ action: z.literal('finish'), photoId: z.string().uuid() }),
  z.object({ action: z.literal('retry'), photoId: z.string().uuid() }),
  z.object({ action: z.literal('remove'), photoId: z.string().uuid() }),
  z.object({ action: z.literal('view'), photoId: z.string().uuid(), download: z.boolean() }),
  z.object({ action: z.literal('process') }),
]);

export async function GET(request: Request, { params }: Context) {
  try {
    const { db, user, admin } = await photoActor();
    const event = await ownedEvent(db, (await params).id, user.id, admin);
    const search = new URL(request.url).searchParams;
    const raw = Number(search.get('page') ?? 0);
    const page = Number.isSafeInteger(raw) && raw >= 0 && raw < 1_000_000 ? raw : 0;
    const filter = photoReviewFilters.find(option => option.value === search.get('filter'))?.value ?? 'all';
    const photosQuery = db.from('event_photos').select('id,file_name,byte_size,status,face_count,error,created_at', { count: 'exact' })
      .eq('event_id', event.id).order('created_at', { ascending: false }).order('id');
    const pendingStatuses = ['queued', 'processing'];
    if (filter === 'pending') photosQuery.in('status', pendingStatuses);
    else if (filter !== 'all') photosQuery.eq('status', filter);
    const [response, pendingQuery] = await Promise.all([
      photosQuery.range(page * photoPageSize, (page + 1) * photoPageSize - 1),
      db.from('event_photos').select('id', { count: 'exact', head: true }).eq('event_id', event.id).in('status', pendingStatuses),
    ]);
    const photos = response.status === 416 ? [] : dbResult(response);
    dbResult(pendingQuery);
    return photoJson({ photos, total: response.count ?? 0, pending: pendingQuery.count ?? 0 });
  } catch (error) {
    return photoFailure(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { db, user, admin } = await photoActor();
    const event = await ownedEvent(db, (await params).id, user.id, admin);
    if (event.deleting) throw new PhotoError('This event is being deleted.', 409);
    const parsed = controls.safeParse(await request.json());
    if (!parsed.success) throw new PhotoError('Invalid request.');
    const input = parsed.data;

    switch (input.action) {
      case 'details': {
        dbResult(await db.from('photo_events').update({
          title: input.title, event_type: input.eventType, event_date: input.eventDate || null,
          ...gallerySettingsFields(input),
          ...(input.faceSearchEnabled === false && { sharing_enabled: false }),
        }).eq('id', event.id).eq('deleting', false));
        if (input.faceSearchEnabled === false) {
          dbResult(await db.from('photo_guest_sessions').delete().eq('event_id', event.id));
        }
        await audit(db, 'event.updated', event.id, user.id);
        return photoJson({ ok: true });
      }
      case 'sharing': {
        if (input.enabled && event.face_search_enabled === false) {
          throw new PhotoError('Enable Allow Face Search in event settings before turning on guest sharing.', 409);
        }
        dbResult(await db.from('photo_events').update({ sharing_enabled: input.enabled }).eq('id', event.id).eq('deleting', false));
        if (!input.enabled) dbResult(await db.from('photo_guest_sessions').delete().eq('event_id', event.id));
        await audit(db, input.enabled ? 'event.sharing_enabled' : 'event.sharing_paused', event.id, user.id);
        return photoJson({ enabled: input.enabled });
      }
      case 'rotate': {
        const token = secretToken();
        dbResult(await db.from('photo_events').update({ share_token: token }).eq('id', event.id).eq('deleting', false));
        dbResult(await db.from('photo_guest_sessions').delete().eq('event_id', event.id));
        await audit(db, 'event.link_rotated', event.id, user.id);
        return photoJson({ token });
      }
      case 'reserve': {
        const id = randomUUID();
        const path = event.id + '/' + id;
        const fileName = input.name.replace(/[\\/\u0000-\u001f\u007f]/g, '_');
        const reserved = dbResult(await db.rpc('reserve_event_photo', {
          p_id: id, p_event: event.id, p_path: path, p_name: fileName, p_bytes: input.size,
        }));
        if (!reserved) throw new PhotoError('This event is closing or has reached the 5,000-photo limit.', 409);
        const upload = dbRequired(await db.storage.from(originalBucket).createSignedUploadUrl(path));
        return photoJson({ id, path, token: upload.token }, 201);
      }
      case 'process':
        return photoJson({ processed: await processNextPhoto(db, event.id) });
      default: {
        const photo = dbResult(await db.from('event_photos').select('*')
          .eq('event_id', event.id).eq('id', input.photoId).maybeSingle()) as EventPhoto | null;
        if (!photo) throw new PhotoError('Photo unavailable.', 404);
        if (input.action === 'finish' && photo.status === 'uploading') {
          const file = dbRequired(await db.storage.from(originalBucket).info(photo.storage_path), 'Upload has not reached storage.');
          if (file.size !== photo.byte_size) throw new PhotoError('The uploaded file size is incorrect.');
          dbResult(await db.from('event_photos').update({ status: 'queued' }).eq('id', photo.id).eq('status', 'uploading'));
        }
        if (input.action === 'retry' && photo.status === 'failed') {
          dbResult(await db.from('event_photos').update({ status: 'queued', error: null }).eq('id', photo.id).eq('status', 'failed'));
        }
        if (input.action === 'view') {
          if (['uploading', 'deleting', 'abandoned'].includes(photo.status)) throw new PhotoError('Photo unavailable.', 404);
          return photoJson({ url: await signedPhoto(db, photo, input.download) });
        }
        if (input.action === 'remove') {
          if (photo.status === 'processing') throw new PhotoError('Wait for processing to finish before removing this photo.', 409);
          const removed = dbResult(await db.from('event_photos').update({ status: 'deleting' }).eq('id', photo.id)
            .eq('status', photo.status).select('id').maybeSingle());
          if (!removed) throw new PhotoError('The photo status changed. Refresh and try again.', 409);
          if (photo.index_attempted) await removePhotoFaces(event.id, photo.id);
          dbResult(await db.storage.from(originalBucket).remove([photo.storage_path, previewPath(photo.storage_path)]));
          dbResult(await db.from('event_photos').delete().eq('id', photo.id));
          await audit(db, 'photo.deleted', event.id, user.id, 1);
        }
        return photoJson({ ok: true });
      }
    }
  } catch (error) {
    return photoFailure(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const id = (await params).id;
    if (!validId(id)) throw new PhotoError('Event unavailable.', 404);
    const { db, user, admin } = await photoActor();
    const event = await ownedEvent(db, id, user.id, admin);
    dbResult(await db.from('photo_events').update({ deleting: true, sharing_enabled: false }).eq('id', id));
    const active = dbRequired(await db.from('event_photos').select('id').eq('event_id', id)
      .eq('status', 'processing').gt('lease_until', new Date().toISOString()).limit(1));
    if (active.length) throw new PhotoError('Sharing is paused. Retry deletion after active processing finishes.', 409);
    await removeEventCollection(id);
    while (true) {
      const photos = dbRequired(await db.from('event_photos').select('id,storage_path').eq('event_id', id).limit(100));
      if (!photos.length) break;
      dbResult(await db.storage.from(originalBucket).remove(photos.flatMap(photo => [photo.storage_path, previewPath(photo.storage_path)])));
      dbResult(await db.from('event_photos').delete().in('id', photos.map(photo => photo.id)));
    }
    await audit(db, 'event.deleted', event.id, user.id);
    dbResult(await db.from('photo_events').delete().eq('id', id));
    return photoJson({ ok: true });
  } catch (error) {
    return photoFailure(error);
  }
}
