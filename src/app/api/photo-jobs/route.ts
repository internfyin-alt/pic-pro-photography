import { timingSafeEqual } from 'node:crypto';
import { processNextPhoto } from '@/lib/event-photos/recognition';
import { sendPendingWhatsApp } from '@/lib/event-photos/whatsapp';
import { originalBucket } from '@/lib/event-photos/constants';
import { dbRequired, dbResult, photoDb, photoFailure, photoJson, previewPath } from '@/lib/event-photos/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from('Bearer ' + (secret ?? ''));
  if (!secret || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return photoJson({ error: 'Unauthorized' }, 401);
  }
  const startedAt = Date.now();
  try {
    const db = photoDb();
    const now = new Date().toISOString();
    dbResult(await db.from('photo_guest_sessions').delete().lt('expires_at', now));
    dbResult(await db.from('photo_guest_registrations').delete().lt('expires_at', now));
    const retention = Date.now() - 48 * 60 * 60 * 1000;
    dbResult(await db.from('photo_rate_limits').delete().lt('bucket', Math.floor(retention / 60_000)));
    const oldUploads = dbRequired(await db.from('event_photos').select('id')
      .eq('status', 'uploading').lt('created_at', new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()).limit(100));
    if (oldUploads.length) dbResult(await db.from('event_photos').update({ status: 'abandoned' })
      .eq('status', 'uploading').in('id', oldUploads.map(photo => photo.id)));
    const stale = dbRequired(await db.from('event_photos').select('id,storage_path').eq('status', 'abandoned').limit(100));
    const cleanup = dbRequired(await db.from('photo_storage_cleanup').select('storage_path').lt('remove_after', now).limit(100));
    if (stale.length || cleanup.length) {
      const paths = [...stale, ...cleanup].flatMap(({ storage_path }) => [storage_path, previewPath(storage_path)]);
      dbResult(await db.storage.from(originalBucket).remove(paths));
      if (stale.length) dbResult(await db.from('event_photos').delete().in('id', stale.map(photo => photo.id)));
      if (cleanup.length) dbResult(await db.from('photo_storage_cleanup').delete().in('storage_path', cleanup.map(photo => photo.storage_path)));
    }
    const deadline = startedAt + 30_000;
    let processed = 0;
    while (Date.now() < deadline && processed < 20 && await processNextPhoto(db)) processed++;
    await sendPendingWhatsApp(db, deadline + 10_000);
    return photoJson({ processed });
  } catch (error) {
    return photoFailure(error);
  }
}

export { run as GET, run as POST };
