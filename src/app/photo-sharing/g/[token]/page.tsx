import GuestPhotoSearch from '@/components/event-photos/GuestPhotoSearch';
import { photoDb, sharedEvent } from '@/lib/event-photos/server';
import styles from '../../sharing.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Find Your Event Photos', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function GuestPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const event = await (async () => sharedEvent(photoDb(), token))().catch(() => null);
  return <main className={styles.shell}><div className="container">
    <div className={styles.brand}>PICPRO Videography</div>
    {event ? <>
      <h1>{event.title}</h1>
      <p>{[event.event_type, event.event_date].filter(Boolean).join(' · ')}</p>
      <GuestPhotoSearch token={token} downloadsEnabled={event.guest_downloads_enabled !== false} />
    </> : <><h1>Event link unavailable</h1><p>Ask your photographer for the current QR code or event link.</p></>}
  </div></main>;
}
