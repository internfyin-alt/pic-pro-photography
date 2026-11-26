import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { dbRequired, dbResult, photoDb, validToken } from '@/lib/event-photos/server';
import { allEventsSharePath, guestSharePath } from '@/lib/event-photos/share-url';
import styles from '../../sharing.module.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Find Your Event',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

const pageSize = 24;
const eventDate = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' });

async function loadDirectory(token: string, page: number) {
  if (!validToken(token)) return null;

  const db = photoDb();
  const [ownerQuery, platformQuery] = await Promise.all([
    db.from('photo_photographers').select('id,name')
      .eq('all_events_share_token', token).eq('all_events_sharing_enabled', true)
      .eq('suspended', false).is('deleted_at', null).maybeSingle(),
    db.from('photo_platform_settings').select('guest_access').eq('singleton', true).single(),
  ]);
  const owner = dbResult(ownerQuery);
  if (!owner || !dbRequired(platformQuery).guest_access) return null;

  const offset = (page - 1) * pageSize;
  const result = await db.from('photo_events').select('title,event_date,event_type,share_token')
    .eq('owner_id', owner.id).eq('sharing_enabled', true).eq('deleting', false)
    .order('event_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false }).order('id')
    .range(offset, offset + pageSize);
  const events = result.status === 416 ? [] : dbRequired(result);
  return { name: owner.name, events: events.slice(0, pageSize), hasNext: events.length > pageSize };
}

export default async function AllEventsPage({ params, searchParams }: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const requestedPage = Number(query.page);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 && requestedPage < 1_000_000 ? requestedPage : 1;
  const directory = await loadDirectory(token, page).catch(() => null);
  const path = allEventsSharePath(token);

  return <main className={styles.shell}><div className="container">
    <div className={styles.brand}>PIC PRO Photography &amp; Videography</div>
    {directory ? <>
      <h1>Find your event</h1>
      <p>Choose an event shared by {directory.name} to find your photos.</p>
      {!!directory.events.length && <ul className={styles.columns + ' ' + styles.directoryList}>
        {directory.events.map(event => <li key={event.share_token} className={styles.card + ' ' + styles.directoryCard}>
          <div>
            <CalendarDays size={23} className={styles.directoryIcon} aria-hidden="true" />
            <h2>{event.title}</h2>
            <p>{event.event_type}{event.event_date && <> · <time dateTime={event.event_date}>
              {eventDate.format(new Date(event.event_date))}
            </time></>}</p>
          </div>
          <Link href={guestSharePath(event.share_token)} prefetch={false} className={styles.primary}
            aria-label={'Find photos from ' + event.title}>Find my photos</Link>
        </li>)}
      </ul>}
      {!directory.events.length && <p className={styles.card + ' ' + styles.directoryList}>
        {page === 1 ? 'No events are shared yet. Check back after your photographer enables guest sharing.' : 'There are no events on this page.'}
      </p>}
      {(page > 1 || directory.hasNext) && <nav aria-label="Shared event pages" className={styles.actions + ' ' + styles.shareActions}>
        {page > 1 && <Link className={styles.secondary} href={page === 2 ? path : path + '?page=' + (page - 1)} prefetch={false}>Previous</Link>}
        <span>Page {page.toLocaleString('en-IN')}</span>
        {directory.hasNext && <Link className={styles.secondary} href={path + '?page=' + (page + 1)} prefetch={false}>Next</Link>}
      </nav>}
    </> : <>
      <h1>Event list unavailable</h1>
      <p>Ask your photographer for a current QR code or event link.</p>
    </>}
  </div></main>;
}
