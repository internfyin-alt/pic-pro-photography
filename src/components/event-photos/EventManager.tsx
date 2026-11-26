'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, ImagePlus, Images, Link2, ScanFace, Settings2, ShieldCheck } from 'lucide-react';
import { eventTypes, maxPhotoBytes, originalBucket, photoMimeTypes, photoPageSize, photoReviewFilters, type PhotoReviewFilter } from '@/lib/event-photos/constants';
import { photoMessage, photoRequest, startDownload } from '@/lib/event-photos/client';
import styles from '@/app/photo-sharing/sharing.module.css';
import studio from '@/app/photo-sharing/studio/Studio.module.css';
import GallerySettings, { readGallerySettings, type GallerySettingsValues } from './GallerySettings';

const sections = [
  { id: 'photos', label: 'Photos', icon: Images },
  { id: 'details', label: 'Basic details', icon: Settings2 },
  { id: 'sharing', label: 'Share links & QR code', icon: Link2 },
  { id: 'access', label: 'Access details', icon: ShieldCheck },
  { id: 'faces', label: 'Face search', icon: ScanFace },
] as const;

function subscribeToHash(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function getHash() {
  return window.location.hash;
}

type Photo = { id: string; file_name: string; status: string; face_count: number; error: string | null };
type Listing = { photos: Photo[]; total: number; pending: number };
type PhotoSelection = { page: number; filter: PhotoReviewFilter };
type Settings = {
  id: string;
  title: string;
  eventType: string;
  eventDate: string;
  enabled: boolean;
  deleting: boolean;
  share: { qr: string; url: string; whatsappUrl: string } | null;
  searches: number;
  registrations: number;
  admin: boolean;
  gallerySettings: GallerySettingsValues;
  initialSection?: string;
  cover?: string;
  activity: ReactNode;
};

export default function EventManager({
  id, title, eventType, eventDate, enabled, deleting, share, searches, registrations, admin, gallerySettings, initialSection, cover, activity,
}: Settings) {
  const api = '/api/photo-events/' + id;
  const router = useRouter();
  const [list, setList] = useState<Listing>({ photos: [], total: 0, pending: 0 });
  const [listState, setListState] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const [selection, setSelection] = useState<PhotoSelection>({ page: 0, filter: 'all' });
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const currentSelection = useRef(selection);
  const { page, filter } = selection;
  const hash = useSyncExternalStore(subscribeToHash, getHash, () => '');
  const section = sections.find(({ id }) => hash === '#studio-' + id)?.id
    ?? sections.find(({ id }) => id === initialSection)?.id ?? 'photos';

  const refresh = useCallback(async (selected: PhotoSelection) => {
    const query = new URLSearchParams({ page: String(selected.page), filter: selected.filter });
    const result = await photoRequest<Listing>(api + '?' + query, 'GET');
    if (selected === currentSelection.current) {
      setList(result);
      setListState('loaded');
    }
  }, [api]);

  useEffect(() => {
    if (deleting) return;
    void refresh(selection).catch(error => {
      if (selection === currentSelection.current) {
        setListState('failed');
        setStatus(photoMessage(error));
      }
    });
    const timer = window.setInterval(() => { void refresh(selection).catch(() => {}); }, 8_000);
    return () => window.clearInterval(timer);
  }, [deleting, selection, refresh]);

  function selectPhotos(page: number, filter: PhotoReviewFilter) {
    const next = { page, filter };
    currentSelection.current = next;
    setSelection(next);
    setListState('loading');
    setList(previous => ({ photos: [], total: 0, pending: previous.pending }));
    return next;
  }

  async function operate(action: () => Promise<void>) {
    setBusy(true);
    setStatus('');
    try {
      await action();
    } catch (error) {
      setStatus(photoMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function processQueue() {
    while (true) {
      const result = await photoRequest<{ processed: boolean }>(api, 'POST', { action: 'process' });
      await refresh(currentSelection.current);
      if (!result.processed) break;
    }
  }

  function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    if (!files.length) return;
    void operate(async () => {
      let uploaded = 0;
      const failures: string[] = [];
      const { createClient } = await import('@supabase/supabase-js');
      const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '', {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const uploads = selectPhotos(0, 'all');
      for (const [index, file] of files.entries()) {
        let reservation: { id: string; path: string; token: string } | undefined;
        let stored = false;
        setStatus('Uploading ' + (index + 1) + ' of ' + files.length + '…');
        try {
          if (!file.size || file.size > maxPhotoBytes || !photoMimeTypes.includes(file.type)) {
            throw new Error('Choose JPG, PNG or WebP up to 25 MB.');
          }
          const upload = await photoRequest<{ id: string; path: string; token: string }>(api, 'POST', { action: 'reserve', name: file.name, size: file.size, type: file.type });
          reservation = upload;
          const { error } = await client.storage.from(originalBucket).uploadToSignedUrl(upload.path, upload.token, file, { cacheControl: '60' });
          if (error) throw new Error('Storage did not accept the upload.');
          stored = true;
          await photoRequest(api, 'POST', { action: 'finish', photoId: upload.id });
          uploaded++;
        } catch (error) {
          failures.push(file.name + ' — ' + photoMessage(error));
          if (reservation && !stored) await photoRequest(api, 'POST', { action: 'remove', photoId: reservation.id }).catch(() => {});
        }
      }
      await refresh(uploads);
      const summary = uploaded + ' uploaded.' + (failures.length ? ' ' + failures.join(' ') : '');
      setStatus(summary + (uploaded ? ' Indexing faces…' : ''));
      if (uploaded) {
        try {
          await processQueue();
          setStatus(summary + ' See each photo below for its indexing result.');
        } catch (error) {
          setStatus(summary + ' ' + photoMessage(error));
        }
      }
    });
  }

  function changeSharing() {
    void operate(async () => {
      await photoRequest(api, 'POST', { action: 'sharing', enabled: !enabled });
      setStatus(enabled ? 'Guest sharing paused.' : 'Guest sharing enabled.');
      router.refresh();
    });
  }

  function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    void operate(async () => {
      await photoRequest(api, 'POST', {
        action: 'details', title: fields.get('title'), eventType: fields.get('type'), eventDate: fields.get('date'),
        ...readGallerySettings(fields),
      });
      setStatus('Event details saved.');
      router.refresh();
    });
  }

  function rotate() {
    if (!window.confirm('Replace this QR code? The old code and guest sessions will stop working.')) return;
    void operate(async () => {
      await photoRequest(api, 'POST', { action: 'rotate' });
      setStatus('Guest link replaced.');
      router.refresh();
    });
  }

  function deleteEvent() {
    if (!window.confirm('Permanently delete this event and every photo and face record in it?')) return;
    void operate(async () => {
      try {
        await photoRequest(api, 'DELETE');
        router.push(admin ? '/admin/photo-sharing' : '/photo-sharing/studio?view=events');
      } finally {
        router.refresh();
      }
    });
  }

  function photoAction(photoId: string, action: 'finish' | 'retry' | 'remove' | 'preview' | 'download') {
    if (action === 'remove' && !window.confirm('Permanently delete this photo?')) return;
    void operate(async () => {
      if (action === 'preview' || action === 'download') {
        const result = await photoRequest<{ url: string }>(api, 'POST', { action: 'view', photoId, download: action === 'download' });
        if (action === 'download') startDownload(result.url);
        else { setPreview(result.url); dialog.current?.showModal(); }
      } else {
        await photoRequest(api, 'POST', { action, photoId });
        await refresh(currentSelection.current);
        if (action === 'finish' || action === 'retry') await processQueue();
      }
    });
  }

  const addPhotos = <button type="button" className={studio.primary} onClick={() => fileInput.current?.click()} disabled={busy}>
    <ImagePlus size={19} aria-hidden="true" /> Add Photos
  </button>;
  const empty = filter === 'all' && page === 0 && !list.total;
  const photoListMessage = listState === 'loading' ? 'Loading photos'
    : listState === 'failed' ? 'Photos unavailable'
      : empty ? 'Photos not uploaded yet' : page > 0 ? 'No photos on this page.' : 'No photos match this filter.';

  return <div>
    <p className={studio.eventNotice} role="status">{status}</p>
    {deleting ? <section className={styles.card}><h2>Deletion pending</h2><p>Guest access is paused. Continue deleting the files and indexed faces.</p>
      <button type="button" disabled={busy} onClick={deleteEvent} className={styles.secondary}>Continue deletion</button>
    </section> : <div className={studio.eventWorkspace}>
      <aside className={studio.eventSidebar}>
        <div className={studio.eventCover}>
          {cover ? <img src={cover} alt="" referrerPolicy="no-referrer" /> : <Camera size={37} aria-hidden="true" />}
        </div>
        <nav aria-label="Event sections">
          {sections.map(({ id, label, icon: Icon }) => <a key={id} href={'#studio-' + id}
            aria-current={section === id ? 'location' : undefined}><Icon size={18} aria-hidden="true" />{label}</a>)}
        </nav>
      </aside>
      <div className={studio.eventBody}>
        <section id="studio-photos" className={studio.eventSection} hidden={section !== 'photos'}>
          <input ref={fileInput} type="file" multiple accept={photoMimeTypes.join(',')} onChange={upload} disabled={busy} hidden />
          {empty ? <div className={studio.eventEmpty}>
            <span className={studio.eventEmptyIcon}><Images size={30} aria-hidden="true" /></span>
            <h2>{photoListMessage}</h2>
            {addPhotos}
            <p>JPG, PNG or WebP · Up to 25 MB each</p>
          </div> : <>
            <div className={studio.eventSectionHeader}>
              <h2>Photos{list.total > 0 && ' (' + list.total + ')'}</h2>
              {list.pending > 0 && <button type="button" disabled={busy} className={styles.secondary} onClick={() => void operate(processQueue)}>Process pending photos ({list.pending})</button>}
              {addPhotos}
            </div>
            <label className={styles.photoFilter}><span>Indexing status</span>
              <select className="field" value={filter} disabled={busy}
                onChange={event => selectPhotos(0, event.currentTarget.value as PhotoReviewFilter)}>
                {photoReviewFilters.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {!list.photos.length && <p>{photoListMessage}</p>}
            <ul className={styles.photoList}>{list.photos.map(photo => <li key={photo.id} className={styles.photoRow}>
              <div><strong>{photo.file_name}</strong><br /><small>{photo.status === 'ready' ? photo.face_count + ' faces indexed' : photo.status}</small>{photo.error && <p>{photo.error}</p>}</div>
              <div className={styles.actions}>
                {!['uploading', 'deleting', 'abandoned'].includes(photo.status) && <>
                  <button type="button" disabled={busy} onClick={() => photoAction(photo.id, 'preview')} className={styles.secondary}>Preview</button>
                  <button type="button" disabled={busy} onClick={() => photoAction(photo.id, 'download')} className={styles.secondary}>Download</button>
              </>}
              {photo.status === 'uploading' && <button type="button" disabled={busy} onClick={() => photoAction(photo.id, 'finish')} className={styles.secondary}>Check upload</button>}
              {photo.status === 'failed' && <button type="button" disabled={busy} onClick={() => photoAction(photo.id, 'retry')} className={styles.secondary}>Retry</button>}
              <button type="button" disabled={busy || photo.status === 'processing'} onClick={() => photoAction(photo.id, 'remove')} className={styles.secondary}>Delete</button>
            </div>
          </li>)}</ul>
          <div className={styles.actions} style={{ marginTop: 16 }}>
            {page > 0 && <button type="button" disabled={busy} className={styles.secondary} onClick={() => selectPhotos(page - 1, filter)}>Previous</button>}
            {(page + 1) * photoPageSize < list.total && <button type="button" disabled={busy} className={styles.secondary} onClick={() => selectPhotos(page + 1, filter)}>Next</button>}
          </div>
          </>}
        </section>
        <section id="studio-sharing" className={studio.eventSection} hidden={section !== 'sharing'}>
          <h2>Share with guests</h2>
          <p>{!gallerySettings.faceSearchEnabled ? 'Enable Allow Face Search in event settings to share this gallery.' : enabled ? 'Sharing is on. Guests can open your link or scan the QR code to register.' : 'Sharing is paused. Turn it on before sending the link or QR code.'}</p>
          {share
            ? <img src={share.qr} alt="QR code for this event’s selfie search" className={styles.qr} />
            : <p>Set NEXT_PUBLIC_SITE_URL to the live HTTPS website in Vercel and redeploy to generate a guest QR code.</p>}
          <div className={styles.actions + ' ' + styles.shareActions}>
            <button type="button" disabled={busy || !gallerySettings.faceSearchEnabled} onClick={changeSharing} className={enabled ? styles.secondary : styles.primary}>{enabled ? 'Pause sharing' : 'Turn on sharing'}</button>
            {share && <>
              <button type="button" disabled={busy} onClick={() => void operate(async () => {
                await navigator.clipboard.writeText(share.url);
                setStatus('Guest link copied.');
              })} className={enabled ? styles.primary : styles.secondary}>Copy guest link</button>
              <a href={share.qr} download="picpro-event-qr.png" className={styles.secondary}>Download QR</a>
              {enabled && <a href={share.whatsappUrl} target="_blank" rel="noreferrer" className={styles.secondary}>Share on WhatsApp</a>}
            </>}
          </div>
          {share && <details className={styles.details}>
            <summary>Guest link options</summary>
            <div className={styles.actions}>
              {enabled && <a href={share.url} target="_blank" rel="noreferrer" className={styles.secondary}>Open guest link</a>}
              <button type="button" disabled={busy} onClick={rotate} className={styles.secondary}>Replace QR code</button>
            </div>
          </details>}
        </section>
        <section id="studio-details" className={studio.eventSection} hidden={section !== 'details'}>
          <h2>Basic details</h2>
          <form onSubmit={saveDetails} className={styles.stack}>
            <label><span>Event name</span><input name="title" className="field" defaultValue={title} minLength={2} maxLength={100} required /></label>
            <label><span>Event type</span><select name="type" className="field" defaultValue={eventType}>{eventTypes.map(type => <option key={type}>{type}</option>)}</select></label>
            <label><span>Event date</span><input name="date" type="date" className="field" defaultValue={eventDate} /></label>
            <GallerySettings {...gallerySettings} />
            <button type="submit" disabled={busy} className={styles.secondary}>Save details</button>
          </form>
          <div className={styles.shareActions}>
            <button type="button" disabled={busy} onClick={deleteEvent} className={styles.secondary}>Delete event and photos</button>
          </div>
        </section>
        <section id="studio-access" className={studio.eventSection} hidden={section !== 'access'}>
          <h2>Access details</h2>
          <dl className={studio.eventFacts}>
            <div><dt>Guest sharing</dt><dd>{enabled ? 'Enabled' : 'Paused'}</dd></div>
            <div><dt>Photo downloads</dt><dd>{gallerySettings.guestDownloadsEnabled ? 'Enabled' : 'Disabled'}</dd></div>
            <div><dt>WhatsApp number</dt><dd>Required to register</dd></div>
            <div><dt>Active guest registrations</dt><dd>{registrations}</dd></div>
          </dl>
          <a className={styles.secondary} href="#studio-details">Edit access settings</a>
          {activity}
        </section>
        <section id="studio-faces" className={studio.eventSection} hidden={section !== 'faces'}>
          <h2>Face search</h2>
          <p>{gallerySettings.faceSearchEnabled ? 'Guests can find their photos with a selfie when sharing is enabled.' : 'Face search is disabled for this gallery.'}</p>
          <dl className={studio.eventFacts}>
            <div><dt>Guest searches</dt><dd>{searches}</dd></div>
            <div><dt>Photos waiting to be processed</dt><dd>{list.pending}</dd></div>
          </dl>
          <div className={styles.actions}>
            <a className={styles.secondary} href="#studio-details">Edit face search settings</a>
            <a className={styles.secondary} href="#studio-photos">Review photo indexing</a>
          </div>
        </section>
      </div>
    </div>}
    <dialog ref={dialog} className={styles.dialog} onClose={() => setPreview('')}>
      <form method="dialog"><button className={styles.secondary}>Close preview</button></form>
      {preview && <img src={preview} alt="Event photo preview" className={styles.preview} referrerPolicy="no-referrer" />}
    </dialog>
  </div>;
}
