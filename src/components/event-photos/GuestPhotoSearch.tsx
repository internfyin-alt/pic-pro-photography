'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { consentVersion, maxSelfieBytes, photoMimeTypes } from '@/lib/event-photos/constants';
import { photoMessage, photoRequest, startDownload } from '@/lib/event-photos/client';
import styles from '@/app/photo-sharing/sharing.module.css';

type Result = {
  session: string;
  expiresAt: string;
  photos: { id: string; name: string; size: number; previewUrl?: string }[];
};
type DownloadFile = { id: string; name: string; url: string };

async function prepareSelfie(file: File) {
  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to prepare this selfie on your device.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const photo = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', .82));
    if (!photo || photo.size > maxSelfieBytes) throw new Error('Choose a selfie under 3 MB.');
    return photo;
  } finally {
    image.close();
  }
}

export default function GuestPhotoSearch({ token }: { token: string }) {
  const endpoint = '/api/event-guest/' + token;
  const [selfie, setSelfie] = useState<File>();
  const [result, setResult] = useState<Result>();
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState<{ url: string; name: string }>();
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!result) return;
    const timer = window.setTimeout(() => setExpired(true), Math.max(0, Date.parse(result.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [result]);

  async function run(callback: () => Promise<void>) {
    setBusy(true);
    setStatus('');
    try {
      await callback();
    } catch (error) {
      setStatus(photoMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selfie) { setStatus('Take or choose a selfie first.'); return; }
    const consent = new FormData(event.currentTarget).get('consent');
    void run(async () => {
      const form = new FormData();
      form.set('consent', String(consent));
      let photo;
      try {
        photo = await prepareSelfie(selfie);
      } catch (error) {
        if (!photoMimeTypes.includes(selfie.type) || selfie.size > maxSelfieBytes) throw error;
        photo = selfie;
      }
      form.set('selfie', photo, 'selfie.' + (photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg'));
      const matches = await photoRequest<Result>(endpoint, 'POST', form);
      setResult(matches);
      setExpired(false);
      setSelfie(undefined);
      setSelected([]);
    });
  }

  function accessPhoto(id: string, name: string, download: boolean) {
    if (!result) return;
    void run(async () => {
      const item = await photoRequest<{ url: string }>(endpoint, 'POST', { session: result.session, action: download ? 'download' : 'preview', photoId: id });
      if (download) startDownload(item.url);
      else { setPreview({ url: item.url, name }); dialog.current?.showModal(); }
    });
  }

  function zip(ids: string[]) {
    if (!result || !ids.length) return;
    void run(async () => {
      const chosen = result.photos.filter(photo => ids.includes(photo.id));
      const size = chosen.reduce((total, photo) => total + photo.size, 0);
      if (size > 200 * 1024 * 1024) throw new Error('Choose photos totaling under 200 MB per ZIP, or download originals individually.');
      const { default: JSZip } = await import('jszip');
      const archive = new JSZip();
      for (let index = 0; index < chosen.length; index += 4) {
        setStatus('Preparing ' + Math.min(index + 4, chosen.length) + ' of ' + chosen.length + ' photos…');
        const batch = chosen.slice(index, index + 4).map(photo => photo.id);
        const { files } = await photoRequest<{ files: DownloadFile[] }>(endpoint, 'POST', {
          action: 'batch', session: result.session, photoIds: batch,
        });
        if (files.length !== batch.length) throw new Error('One of these photos is no longer available.');
        await Promise.all(files.map(async file => {
          const response = await fetch(file.url, { referrerPolicy: 'no-referrer', cache: 'no-store' });
          if (!response.ok) throw new Error('A photo could not be downloaded. Please try again.');
          const name = file.id.slice(0, 8) + '-' + file.name.replace(/[\\/]/g, '_');
          archive.file(name, await response.blob());
        }));
      }
      const url = URL.createObjectURL(await archive.generateAsync({ type: 'blob' }));
      startDownload(url, 'picpro-event-photos.zip');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setStatus('ZIP download started.');
    });
  }

  function clear() {
    if (!result) return;
    void run(async () => {
      await photoRequest(endpoint, 'POST', { action: 'clear', session: result.session });
      dialog.current?.close();
      setResult(undefined);
      setExpired(false);
      setSelected([]);
      setStatus('Search session ended.');
    });
  }

  return <>
    {!result && <form onSubmit={search} className={styles.narrow + ' ' + styles.card + ' ' + styles.stack}>
      <h2>Find my photos</h2>
      <p>Use a well-lit selfie of yourself with one face. PIC PRO sends it to Amazon Rekognition to search faces indexed for this event. The app does not store your selfie. Results are temporary and may include incorrect matches.</p>
      <label className={styles.check}><input required name="consent" value={consentVersion} type="checkbox" />I am using my own selfie and consent to processing it and my facial features for this event search.</label>
      <label><span>Take a selfie</span><input type="file" className="field" accept="image/*" capture="user" onChange={event => setSelfie(event.currentTarget.files?.[0])} disabled={busy} /></label>
      <label><span>Or choose a saved selfie</span><input type="file" className="field" accept={photoMimeTypes.join(',')} onChange={event => setSelfie(event.currentTarget.files?.[0])} disabled={busy} /></label>
      {selfie && <small>Selected: {selfie.name}</small>}
      <button type="submit" className={styles.primary} disabled={busy}>{busy ? 'Searching…' : 'Find my photos'}</button>
    </form>}
    {result && <section>
      <div className={styles.toolbar}>
        <h2>{expired ? 'Search expired' : result.photos.length + ' matching photos'}</h2>
        <button className={styles.secondary} type="button" disabled={busy} onClick={clear}>{expired ? 'Start a new search' : 'End search and clear session'}</button>
      </div>
      {!expired && <>
        {!result.photos.length && <p>No matches were found. Try another selfie or ask the photographer about uploads.</p>}
        {!!result.photos.length && <div className={styles.actions} style={{ marginBottom: 20 }}>
          <button className={styles.primary} type="button" disabled={busy} onClick={() => zip(result.photos.map(photo => photo.id))}>Download all</button>
          <button className={styles.secondary} type="button" disabled={busy || !selected.length} onClick={() => zip(selected)}>Download selected ({selected.length})</button>
        </div>}
        <div className={styles.gallery}>{result.photos.map(photo => <article className={styles.photoCard} key={photo.id}>
          {photo.previewUrl && <img src={photo.previewUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />}
          <p>{photo.name}</p>
          <label className={styles.check}><input type="checkbox" checked={selected.includes(photo.id)} onChange={event => {
            const checked = event.currentTarget.checked;
            setSelected(ids => checked ? [...ids, photo.id] : ids.filter(id => id !== photo.id));
          }} />Select photo</label>
          <div className={styles.actions}>
            <button className={styles.secondary} type="button" disabled={busy} onClick={() => accessPhoto(photo.id, photo.name, false)}>Preview</button>
            <button className={styles.secondary} type="button" disabled={busy} onClick={() => accessPhoto(photo.id, photo.name, true)}>Download</button>
          </div>
        </article>)}</div>
      </>}
    </section>}
    <p className={styles.status} role="status">{status}</p>
    <dialog ref={dialog} className={styles.dialog} onClose={() => setPreview(undefined)}>
      <form method="dialog"><button className={styles.secondary}>Close preview</button></form>
      {preview && <img src={preview.url} alt={preview.name} className={styles.preview} referrerPolicy="no-referrer" />}
    </dialog>
  </>;
}
