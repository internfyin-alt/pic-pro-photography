import Link from 'next/link';
import { redirect } from 'next/navigation';
import CreateEvent from '@/components/event-photos/CreateEvent';
import { dbRequired, photoActor, PhotoError } from '@/lib/event-photos/server';
import { createPhotographer, photographerLogout, updatePhotographer } from '../actions';
import styles from '@/components/workspace/Workspace.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Photographer Studio', robots: { index: false } };

export default async function Studio({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const result = await photoActor().catch((error: unknown) => {
    if (error instanceof PhotoError && error.status === 401) redirect('/photo-sharing/login');
    return error instanceof PhotoError ? error : new PhotoError('Photographer Studio is unavailable.');
  });
  if (result instanceof PhotoError) return <main className={styles.workspace}><div className="container">
    <div className={styles.intro}><h1>Photographer studio</h1><p role="alert">{result.message}</p></div>
    <Link className={styles.textLink} href="/photo-sharing/login">Back to sign in</Link>
  </div></main>;

  const { db, owner, user } = result;
  const { status } = await searchParams;
  const displayName = owner?.name || (typeof user.user_metadata?.photographer_name === 'string' ? user.user_metadata.photographer_name : '');
  const events = owner ? dbRequired(await db.from('photo_events').select('id,title,event_type,event_date,sharing_enabled,deleting')
    .eq('owner_id', user.id).order('created_at', { ascending: false })) : [];
  return <main className={styles.workspace}><div className="container">
    <div className={styles.toolbar + ' ' + styles.intro}>
      <div><h1>Photographer studio</h1>{owner && <p>{displayName}</p>}</div>
      <form action={photographerLogout}><button type="submit" className={styles.secondary}>Sign out</button></form>
    </div>
    {!owner ? <form className={styles.panel + ' ' + styles.stack + ' ' + styles.narrow} action={createPhotographer}>
      <h2>Set up your studio</h2>
      <label className={styles.fieldLabel}>Display name<input className="field" name="name" defaultValue={displayName} minLength={2} maxLength={100} required /></label>
      {status && <p role="status">Could not save your studio. Check the display name and try again.</p>}
      <button type="submit" className={styles.primary}>Save studio</button>
    </form> : <div className={styles.columns}>
      <section className={styles.stack}>
        <div className={styles.toolbar}>
          <h2>Your events</h2>
          {events.length > 0 && <a href="#create-event" className={styles.primary}>New event</a>}
        </div>
        {events.length === 0 && <p className={styles.panel}>Create your first event to upload photos and get a guest link.</p>}
        {events.length > 0 && <ul className={styles.eventList}>
          {events.map(event => (
            <li key={event.id} className={styles.panel + ' ' + styles.toolbar + ' ' + styles.eventRow}>
              <div><h3>{event.title}</h3><p>{[event.event_type, event.event_date].filter(Boolean).join(' · ')}</p></div>
              <span className={styles.tag}>{event.deleting ? 'Deletion pending' : event.sharing_enabled ? 'Sharing on' : 'Private'}</span>
              <Link href={'/photo-sharing/studio/' + event.id} className={styles.secondary} aria-label={'Manage event ' + event.title}>Manage event</Link>
            </li>
          ))}
        </ul>}
      </section>
      <aside className={styles.stack}>
        <section id="create-event" tabIndex={-1} className={styles.panel + ' ' + styles.stack + ' ' + styles.anchor}>
          <h2>Create an event</h2>
          <CreateEvent />
        </section>
        <details className={styles.panel + ' ' + styles.disclosure} open={status ? true : undefined}>
          <summary>Studio profile</summary>
          <form action={updatePhotographer} className={styles.stack}>
            <p>{user.email}</p>
            <label className={styles.fieldLabel}>Display name<input className="field" name="name" defaultValue={displayName} minLength={2} maxLength={100} required /></label>
            {status && <p role="status">{status === 'saved' ? 'Profile saved.' : 'Unable to save the profile.'}</p>}
            <button type="submit" className={styles.secondary}>Save profile</button>
            <Link className={styles.textLink} href="/photo-sharing/reset?mode=change">Change password</Link>
          </form>
        </details>
      </aside>
    </div>}
  </div></main>;
}
