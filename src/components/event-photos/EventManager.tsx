'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { eventTypes, maxPhotoBytes, originalBucket, photoMimeTypes } from '@/lib/event-photos/constants';
import { photoMessage, photoRequest, startDownload } from '@/lib/event-photos/client';
import styles from '@/app/photo-sharing/sharing.module.css';

type Photo = { id: string; file_name: string; status: string; face_count: number; error: string | null };
type Listing = { photos: Photo[]; total: number; pending: number };
type Settings = {
  id: string;
  title: string;
  eventType: string;
  eventDate: string;
  enabled: boolean;
  deleting: boolean;
  qr: string;
  url: string;
  searches: number;
  admin: boolean;
};

export default function EventManager({ id, title, eventType, eventDate, enabled, deleting, qr, url, searches, admin }: Settings) {
  const api = '/api/photo-events/' + id;
  const router = useRouter();
  const [list, setList] = useState<Listing>({ photos: [], total: 0, pending: 0 });
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const currentPage = useRef(0);

  const refresh = useCallback(async (selected: number) => {
    const result = await photoRequest<Listing>(api + '?page=' + selected, 'GET');
    if (selected === currentPage.current) setList(result);
    return result;
  }, [api]);

  useEffect(() => {
    void refresh(page).catch(error => setStatus(photoMessage(error)));
    const timer = window.setInterval(() => { void refresh(page).catch(() => {}); }, 8_000);
    return () => window.clearInterval(timer);
  }, [page, refresh]);

  function selectPage(value: number) {
    currentPage.current = value;
    setPage(value);
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
      await refresh(currentPage.current);
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
      const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '', {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      selectPage(0);
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
      await refresh(0);
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
        router.push(admin ? '/admin/photo-sharing' : '/photo-sharing/studio');
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
        await refresh(currentPage.current);
        if (action === 'finish' || action === 'retry') await processQueue();
      }
    });
  }

  return <div className={styles.stack}>
    <div className={styles.columns}>
      <div className={styles.counter}><strong>{list.total}</strong>Photos</div>
      <div className={styles.counter}><strong>{list.pending}</strong>Queued or processing</div>
      <div className={styles.counter}><strong>{searches}</strong>Guest searches</div>
    </div>
    <p className={styles.status} role="status">{status}</p>
    {deleting ? <section className={styles.card}><h2>Deletion pending</h2><p>Guest access is paused. Continue deleting the files and indexed faces.</p>
      <button type="button" disabled={busy} onClick={deleteEvent} className={styles.secondary}>Continue deletion</button>
    </section> : <div className={styles.split}>
      <section className={styles.card}>
        <div className={styles.toolbar}>
          <h2>Event photos</h2>
          <button type="button" disabled={busy || !list.pending} className={styles.secondary} onClick={() => void operate(processQueue)}>Process queue</button>
        </div>
        <label><span>Upload photographs</span><input className="field" type="file" multiple accept={photoMimeTypes.join(',')} onChange={upload} disabled={busy} /></label>
        <p>JPG, PNG or WebP. Up to 25 MB per original.</p>
        {!list.photos.length && <p>No photos on this page.</p>}
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
          {page > 0 && <button type="button" className={styles.secondary} onClick={() => selectPage(page - 1)}>Previous</button>}
          {(page + 1) * 50 < list.total && <button type="button" className={styles.secondary} onClick={() => selectPage(page + 1)}>Next</button>}
        </div>
      </section>
      <aside className={styles.stack}>
        <form onSubmit={saveDetails} className={styles.card + ' ' + styles.stack}>
          <h2>Event details</h2>
          <label><span>Event name</span><input name="title" className="field" defaultValue={title} minLength={2} maxLength={100} required /></label>
          <label><span>Event type</span><select name="type" className="field" defaultValue={eventType}>{eventTypes.map(type => <option key={type}>{type}</option>)}</select></label>
          <label><span>Event date</span><input name="date" type="date" className="field" defaultValue={eventDate} /></label>
          <button type="submit" disabled={busy} className={styles.secondary}>Save details</button>
        </form>
        <section className={styles.card}>
          <h2>Guest QR code</h2>
          <p>{enabled ? 'Anyone with the link can open the selfie search for this event.' : 'Sharing is paused. Enable it before giving guests the QR code.'}</p>
          <img src={qr} alt="QR code for this event’s selfie search" className={styles.qr} />
          <div className={styles.stack}>
            <button type="button" disabled={busy} onClick={changeSharing} className={styles.primary}>{enabled ? 'Pause sharing' : 'Enable sharing'}</button>
            <button type="button" disabled={busy} onClick={() => void operate(async () => {
              await navigator.clipboard.writeText(url);
              setStatus('Guest link copied.');
            })} className={styles.secondary}>Copy guest link</button>
            <a href={qr} download="picpro-event-qr.png" className={styles.secondary}>Download QR</a>
            <button type="button" disabled={busy} onClick={rotate} className={styles.secondary}>Replace QR code</button>
          </div>
        </section>
        <section className={styles.card}><h2>Delete event</h2><button type="button" disabled={busy} onClick={deleteEvent} className={styles.secondary}>Delete event and photos</button></section>
      </aside>
    </div>}
    <dialog ref={dialog} className={styles.dialog} onClose={() => setPreview('')}>
      <form method="dialog"><button className={styles.secondary}>Close preview</button></form>
      {preview && <img src={preview} alt="Event photo preview" className={styles.preview} referrerPolicy="no-referrer" />}
    </dialog>
  </div>;
}
