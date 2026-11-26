import QRCode from 'qrcode';
import { Download, QrCode } from 'lucide-react';
import type { PhotoDb } from '@/lib/event-photos/server';
import { allEventsShareUrl } from '@/lib/event-photos/share-url';
import { setAllEventsSharing } from '../actions';
import ShareDirectoryLink from './ShareDirectoryLink';
import styles from './Studio.module.css';

export default async function AllEventsQr({ db, ownerId, status }: { db: PhotoDb; ownerId: string; status?: string }) {
  const { data, error } = await db.from('photo_photographers')
    .select('all_events_share_token,all_events_sharing_enabled')
    .eq('id', ownerId).single();
  const enabled = data?.all_events_sharing_enabled === true;
  const token = data?.all_events_share_token;
  const url = enabled && token ? allEventsShareUrl(token) : null;
  const qr = url ? await QRCode.toDataURL(url, { width: 440, margin: 3, errorCorrectionLevel: 'M' }) : null;

  return <section className={styles.panel} aria-labelledby="all-events-qr">
    <div className={styles.panelHeading}>
      <div className={styles.headingWithIcon}>
        <span className={styles.iconBox}><QrCode size={22} aria-hidden="true" /></span>
        <h2 id="all-events-qr">One QR for all events</h2>
      </div>
      {!error && <span className={styles.badge} data-live={enabled}>
        {enabled ? 'Enabled' : token ? 'Paused' : 'Off'}
      </span>}
    </div>
    {error ? <p className={styles.metricNote} role="status">The all-events QR is currently unavailable.</p> : <>
      <p className={styles.metricNote}>Guests who scan this code can choose from your events with sharing turned on. New events appear here as soon as you enable guest sharing for them.</p>
      {status === 'all-events-failed' && <p role="alert">Unable to update the all-events QR. Try again.</p>}
      {qr && url && <div className={styles.allEventsQr}>
        <img src={qr} width={220} height={220} alt="QR code for your shared events" />
        <div>
          <ShareDirectoryLink url={url} />
          <div className={styles.actions}>
            <a className={styles.primary} href={qr} download="picpro-all-events-qr.png">
              <Download size={17} aria-hidden="true" />Download QR
            </a>
            <a className={styles.secondary} href={url} target="_blank" rel="noreferrer">Open guest page</a>
          </div>
        </div>
      </div>}
      {enabled && !url && <p role="status">Set the public site URL to generate a QR code guests can scan.</p>}
      {!enabled && token && <p className={styles.metricNote}>Resume sharing to use the same QR code again.</p>}
      <form action={setAllEventsSharing} className={styles.qrSettings}>
        <input type="hidden" name="enabled" value={String(!enabled)} />
        <button type="submit" className={enabled ? styles.secondary : styles.primary}>
          {enabled ? 'Pause all-events QR' : token ? 'Resume all-events QR' : 'Create all-events QR'}
        </button>
      </form>
    </>}
  </section>;
}
