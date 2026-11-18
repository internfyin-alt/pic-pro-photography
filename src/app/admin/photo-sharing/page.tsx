import Link from 'next/link';
import { redirect } from 'next/navigation';
import AdminNav from '@/components/AdminNav';
import { dbRequired, dbResult, photoActor, PhotoError } from '@/lib/event-photos/server';
import { setGuestAccess, setPhotographerStatus } from '@/app/photo-sharing/actions';
import styles from '@/app/photo-sharing/sharing.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Photo Sharing Administration', robots: { index: false } };

export default async function PhotoSharingAdmin({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const actor = await photoActor(true).catch((error: unknown) => {
    if (error instanceof PhotoError && error.status === 401) redirect('/admin/login');
    if (error instanceof PhotoError && error.status === 403) redirect('/');
    return null;
  });
  if (!actor) return <main className={styles.shell}><div className="container"><h1>Photo Sharing Administration</h1><p>Connect the event photo sharing database to continue.</p></div></main>;

  const { db } = actor;
  const requestPage = Number((await searchParams).page ?? '1');
  const page = Number.isInteger(requestPage) && requestPage > 0 ? Math.min(requestPage, 10_000) : 1;
  const start = (page - 1) * 50;
  const [owners, events, photos, activity, usage, settingsQuery] = await Promise.all([
    db.from('photo_photographers').select('id,name,email,suspended', { count: 'exact' }).order('created_at', { ascending: false }).order('id').range(start, start + 49),
    db.from('photo_events').select('id,title,event_type,sharing_enabled', { count: 'exact' }).order('created_at', { ascending: false }).order('id').range(start, start + 49),
    db.from('event_photos').select('id', { count: 'exact', head: true }),
    db.from('photo_audit').select('id,action,event_id,actor_id,subject_id,result_count,created_at', { count: 'exact' }).order('id', { ascending: false }).range(start, start + 49),
    db.rpc('photo_platform_usage'),
    db.from('photo_platform_settings').select('guest_access').single(),
  ]);
  const photographers = dbRequired(owners);
  const eventRows = dbRequired(events);
  dbResult(photos);
  const audit = dbRequired(activity);
  const metrics = dbResult(usage) as { bytes: number; faces: number; indexed: number; failed: number; guest_searches: number };
  const settings = dbRequired(settingsQuery);
  const megabytes = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(metrics.bytes / 1024 / 1024);
  const counters: [string, string | number][] = [
    ['Photographers', owners.count ?? 0], ['Events', events.count ?? 0], ['Original photos', photos.count ?? 0],
    ['Original storage', megabytes + ' MB'], ['Photos indexed', metrics.indexed], ['Faces indexed', metrics.faces],
    ['Indexing failures', metrics.failed], ['Guest searches', metrics.guest_searches],
  ];

  return <main className={styles.shell}><div className="container">
    <h1>Photo Sharing Administration</h1>
    <AdminNav />
    <div className={styles.columns}>{counters.map(([label, value]) => <div className={styles.counter} key={label}><strong>{value}</strong>{label}</div>)}</div>
    <section className={styles.section + ' ' + styles.card}>
      <h2>Guest access settings</h2>
      <p>{settings.guest_access ? 'Guest access is available for active event links.' : 'Guest photo sharing is paused across the platform.'}</p>
      <form action={setGuestAccess}>
        <input name="enabled" type="hidden" value={String(!settings.guest_access)} />
        <button className={styles.secondary} type="submit">{settings.guest_access ? 'Pause guest access platform-wide' : 'Resume guest access'}</button>
      </form>
    </section>
    <section className={styles.section}>
      <h2>Photographers</h2>
      {!photographers.length && <p>No photographers on this page.</p>}
      <ul className={styles.photoList}>{photographers.map(owner => <li className={styles.photoRow} key={owner.id}>
        <span><strong>{owner.name}</strong><br /><small>{owner.email} · {owner.suspended ? 'Suspended' : 'Active'}</small></span>
        <form action={setPhotographerStatus}>
          <input name="id" type="hidden" value={owner.id} />
          <input name="suspended" type="hidden" value={String(!owner.suspended)} />
          <button className={styles.secondary} type="submit">{owner.suspended ? 'Activate' : 'Suspend'}</button>
        </form>
      </li>)}</ul>
    </section>
    <section className={styles.section}>
      <h2>Events</h2>
      {!eventRows.length && <p>No events on this page.</p>}
      <ul className={styles.photoList}>{eventRows.map(event => <li className={styles.photoRow} key={event.id}>
        <Link href={'/photo-sharing/studio/' + event.id}>{event.title}</Link><small>{event.event_type} · {event.sharing_enabled ? 'Sharing on' : 'Private'}</small>
      </li>)}</ul>
    </section>
    <section className={styles.section}>
      <h2>Audit log</h2>
      {!audit.length && <p>No activity on this page.</p>}
      <ul className={styles.photoList}>{audit.map(entry => <li className={styles.photoRow} key={entry.id}>
        <span>{entry.action.replaceAll('.', ' ').replaceAll('_', ' ')}{entry.result_count === null ? '' : ' · ' + entry.result_count}<br />
          {entry.event_id && <small>Event {entry.event_id}</small>} {entry.actor_id && <small>Account {entry.actor_id}</small>}
          {entry.subject_id && <small> · Affected account {entry.subject_id}</small>}
        </span><time dateTime={entry.created_at}>{entry.created_at.slice(0, 10)}</time>
      </li>)}</ul>
    </section>
    <nav className={styles.actions} aria-label="Photo sharing administration pages">
      {page > 1 && <Link className={styles.secondary} href={'/admin/photo-sharing?page=' + (page - 1)}>Previous page</Link>}
      {page * 50 < Math.max(owners.count ?? 0, events.count ?? 0, activity.count ?? 0) &&
        <Link className={styles.secondary} href={'/admin/photo-sharing?page=' + (page + 1)}>Next page</Link>}
    </nav>
  </div></main>;
}
