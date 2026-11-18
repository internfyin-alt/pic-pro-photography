import Link from 'next/link';
import { redirect } from 'next/navigation';
import CreateEvent from '@/components/event-photos/CreateEvent';
import { dbRequired, photoActor, PhotoError } from '@/lib/event-photos/server';
import { createPhotographer, photographerLogout, updatePhotographer } from '../actions';
import styles from '../sharing.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Photographer Studio', robots: { index: false } };

export default async function Studio({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const result = await photoActor().catch((error: unknown) => {
    if (error instanceof PhotoError && error.status === 401) redirect('/photo-sharing/login');
    return error instanceof PhotoError ? error : new PhotoError('Photographer Studio is unavailable.');
  });
  if (result instanceof PhotoError) return <main className={styles.shell}><div className="container">
    <h1>Photographer Studio</h1><p>{result.message}</p><Link href="/photo-sharing">Event Photo Sharing</Link>
  </div></main>;

  const { db, owner, user } = result;
  const { status } = await searchParams;
  const displayName = owner?.name || (typeof user.user_metadata?.photographer_name === 'string' ? user.user_metadata.photographer_name : '');
  const events = owner ? dbRequired(await db.from('photo_events').select('id,title,event_type,event_date,sharing_enabled,deleting')
    .eq('owner_id', user.id).order('created_at', { ascending: false })) : [];
  return <main className={styles.shell}><div className="container">
    <div className={styles.toolbar}>
      <Link href="/photo-sharing">Event Photo Sharing</Link>
      <form action={photographerLogout}><button type="submit" className={styles.secondary}>Sign out</button></form>
    </div>
    <h1>Photographer Studio</h1>
    {!owner ? <form className={styles.card + ' ' + styles.stack} action={createPhotographer}>
      <h2>Set up your studio</h2>
      <label><span>Display name</span><input className="field" name="name" defaultValue={displayName} minLength={2} maxLength={100} required /></label>
      {status && <p role="status">Check the display name and try again.</p>}
      <button type="submit" className={styles.primary}>Save studio</button>
    </form> : <div className={styles.split}>
      <section className={styles.stack}>
        <h2>{displayName}’s events</h2>
        {!events.length && <p>Your events will appear here after you create one.</p>}
        {events.map(event => <article key={event.id} className={styles.card}>
          <h3><Link href={'/photo-sharing/studio/' + event.id}>{event.title}</Link></h3>
          <p>{[event.event_type, event.event_date, event.deleting ? 'Deletion pending' : event.sharing_enabled ? 'Sharing on' : 'Private'].filter(Boolean).join(' · ')}</p>
        </article>)}
      </section>
      <aside className={styles.stack}>
        <section className={styles.card}><h2>Create an event</h2><CreateEvent /></section>
        <form action={updatePhotographer} className={styles.card + ' ' + styles.stack}>
          <h2>Studio profile</h2>
          <small>{user.email}</small>
          <label><span>Display name</span><input className="field" name="name" defaultValue={displayName} minLength={2} maxLength={100} required /></label>
          {status && <small role="status">{status === 'saved' ? 'Profile saved.' : 'Unable to save the profile.'}</small>}
          <button type="submit" className={styles.secondary}>Save profile</button>
          <Link href="/photo-sharing/reset?mode=change">Change password</Link>
        </form>
      </aside>
    </div>}
  </div></main>;
}
