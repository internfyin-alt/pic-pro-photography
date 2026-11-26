import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import QRCode from 'qrcode';
import { redirect } from 'next/navigation';
import EventManager from '@/components/event-photos/EventManager';
import AlbumFlipbook from '@/components/event-photos/AlbumFlipbook';
import { dbRequired, dbResult, ownedEvent, photoActor, PhotoError, signedPhoto, type PhotoDb } from '@/lib/event-photos/server';
import { guestShareUrl, whatsappShareUrl } from '@/lib/event-photos/share-url';
import styles from '../../sharing.module.css';
import StudioFrame, { studioHref } from '../StudioFrame';
import studio from '../Studio.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Manage Event Photos', robots: { index: false }, referrer: 'no-referrer' };

async function eventCover(db: PhotoDb, id: string) {
  const result = await db.from('event_photos').select('*').eq('event_id', id)
    .eq('status', 'ready').order('created_at').order('id').limit(1).maybeSingle();
  return result.data ? signedPhoto(db, result.data) : undefined;
}

export default async function ManageEvent({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; section?: string }>;
}) {
  const query = await searchParams;
  let data;
  try {
    const actor = await photoActor();
    const event = await ownedEvent(actor.db, (await params).id, actor.user.id, actor.admin);
    const isOtherOwnerAdmin = actor.admin && actor.user.id !== event.owner_id;
    const name = actor.owner?.name || actor.user.email;
    if (query.view === 'album' && !event.deleting) {
      return <StudioFrame active="album" name={name} canManage={!isOtherOwnerAdmin}>
        <main className={studio.main}>
          <Link className={studio.textLink} href={isOtherOwnerAdmin ? '/admin/photo-sharing' : studioHref('album')}>
            {isOtherOwnerAdmin ? 'Back to administration' : 'Back to albums'}
          </Link>
          <h1>{event.title}</h1>
          <AlbumFlipbook eventId={event.id} />
        </main>
      </StudioFrame>;
    }
    const url = guestShareUrl(event.share_token);
    const [qr, activityQuery, searches, registrations, cover] = await Promise.all([
      url ? QRCode.toDataURL(url, { width: 440, margin: 3, errorCorrectionLevel: 'M' }) : null,
      actor.db.from('photo_audit').select('action,result_count,created_at')
        .eq('event_id', event.id).order('created_at', { ascending: false }).limit(20),
      actor.db.from('photo_audit').select('id', { count: 'exact', head: true })
        .eq('event_id', event.id).eq('action', 'guest.search'),
      actor.db.from('photo_guest_registrations').select('token_hash', { count: 'exact', head: true })
        .eq('event_id', event.id).gt('expires_at', new Date().toISOString()),
      event.deleting ? undefined : eventCover(actor.db, event.id).catch(() => undefined),
    ]);
    const share = url && qr ? { url, qr, whatsappUrl: whatsappShareUrl(url, event.title) } : null;
    const activity = dbRequired(activityQuery);
    dbResult(searches);
    dbResult(registrations);
    data = {
      event, share, activity, searches: searches.count ?? 0, registrations: registrations.count ?? 0,
      admin: isOtherOwnerAdmin, name, cover,
    };
  } catch (error) {
    if (error instanceof PhotoError && error.status === 401) redirect('/photo-sharing/login');
    return <StudioFrame active="events"><main className={studio.main}>
      <div className={studio.panel + ' ' + studio.formPanel}>
        <h1>Event photos</h1><p role="alert">{error instanceof PhotoError ? error.message : 'Unable to open this event.'}</p>
        <Link className={studio.secondary} href={studioHref('events')}>Back to events</Link>
      </div>
    </main></StudioFrame>;
  }

  return <StudioFrame active="events" name={data.name} canManage={!data.admin} eventWorkspace>
    <main className={studio.galleryMain}>
      <Link className={studio.galleryBack} href={data.admin ? '/admin/photo-sharing' : studioHref('events')}>
        <ChevronLeft size={18} aria-hidden="true" /> {data.admin ? 'Back to administration' : 'All Galleries'}
      </Link>
      <div className={studio.galleryHeading}>
        <div><h1>{data.event.title}</h1><p>{[data.event.event_type, data.event.event_date].filter(Boolean).join(' · ')}</p></div>
      </div>
      <div className={styles.shell + ' ' + studio.eventManager}>
        <EventManager
          key={data.event.id}
          id={data.event.id}
          title={data.event.title}
          eventType={data.event.event_type}
          eventDate={data.event.event_date ?? ''}
          enabled={data.event.sharing_enabled}
          deleting={data.event.deleting}
          share={data.share}
          searches={data.searches}
          registrations={data.registrations}
          admin={data.admin}
          initialSection={query.section}
          cover={data.cover}
          activity={<details className={studio.eventActivity + ' ' + styles.disclosure}>
            <summary>Recent event activity</summary>
            {!data.activity.length && <p>No activity yet.</p>}
            <ul className={styles.photoList}>{data.activity.map((entry, index) => <li className={styles.photoRow} key={entry.created_at + index}>
              <span>{entry.action.replaceAll('.', ' ').replaceAll('_', ' ')}{entry.result_count === null ? '' : ' · ' + entry.result_count + ' photos'}</span>
              <time dateTime={entry.created_at}>{entry.created_at.slice(0, 10)}</time>
            </li>)}</ul>
          </details>}
          gallerySettings={{
            guestDownloadsEnabled: data.event.guest_downloads_enabled !== false,
            faceSearchEnabled: data.event.face_search_enabled !== false,
          }}
        />
      </div>
    </main>
  </StudioFrame>;
}
