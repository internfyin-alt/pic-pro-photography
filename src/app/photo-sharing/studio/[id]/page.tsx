import Link from 'next/link';
import QRCode from 'qrcode';
import { redirect } from 'next/navigation';
import EventManager from '@/components/event-photos/EventManager';
import { dbRequired, dbResult, ownedEvent, photoActor, PhotoError } from '@/lib/event-photos/server';
import { guestShareUrl } from '@/lib/event-photos/share-url';
import styles from '../../sharing.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Manage Event Photos', robots: { index: false }, referrer: 'no-referrer' };

export default async function ManageEvent({ params }: { params: Promise<{ id: string }> }) {
  let data;
  try {
    const actor = await photoActor();
    const event = await ownedEvent(actor.db, (await params).id, actor.user.id, actor.admin);
    const url = guestShareUrl(event.share_token);
    const share = url ? { url, qr: await QRCode.toDataURL(url, { width: 440, margin: 3, errorCorrectionLevel: 'M' }) } : null;
    const activity = dbRequired(await actor.db.from('photo_audit').select('action,result_count,created_at')
      .eq('event_id', event.id).order('created_at', { ascending: false }).limit(20));
    const searches = await actor.db.from('photo_audit').select('id', { count: 'exact', head: true })
      .eq('event_id', event.id).eq('action', 'guest.search');
    dbResult(searches);
    data = { event, share, activity, searches: searches.count ?? 0, admin: actor.admin && actor.user.id !== event.owner_id };
  } catch (error) {
    if (error instanceof PhotoError && error.status === 401) redirect('/photo-sharing/login');
    return <main className={styles.shell}><div className="container"><h1>Event photos</h1>
      <p>{error instanceof PhotoError ? error.message : 'Unable to open this event.'}</p><Link href="/photo-sharing/studio">Back to Studio</Link>
    </div></main>;
  }

  return <main className={styles.shell}><div className="container">
    <Link href={data.admin ? '/admin/photo-sharing' : '/photo-sharing/studio'}>{data.admin ? 'Back to administration' : 'Back to Studio'}</Link>
    <h1>{data.event.title}</h1><p>{[data.event.event_type, data.event.event_date].filter(Boolean).join(' · ')}</p>
    <EventManager
      id={data.event.id}
      title={data.event.title}
      eventType={data.event.event_type}
      eventDate={data.event.event_date ?? ''}
      enabled={data.event.sharing_enabled}
      deleting={data.event.deleting}
      share={data.share}
      searches={data.searches}
      admin={data.admin}
    />
    <section className={styles.section}>
      <h2>Recent event activity</h2>
      {!data.activity.length && <p>No activity yet.</p>}
      <ul className={styles.photoList}>{data.activity.map((entry, index) => <li className={styles.photoRow} key={entry.created_at + index}>
        <span>{entry.action.replaceAll('.', ' ').replaceAll('_', ' ')}{entry.result_count === null ? '' : ' · ' + entry.result_count + ' photos'}</span>
        <time dateTime={entry.created_at}>{entry.created_at.slice(0, 10)}</time>
      </li>)}</ul>
    </section>
  </div></main>;
}
