'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { consentVersion, guestRegistrationDays, maxSelfieBytes, photoMimeTypes } from '@/lib/event-photos/constants';
import { photoMessage, photoRequest, startDownload } from '@/lib/event-photos/client';
import styles from '@/app/photo-sharing/sharing.module.css';

type Result = {
  status: 'found';
  session: string;
  expiresAt: string;
  registrationExpiresAt: string;
  photos: { id: string; name: string; size: number; previewUrl?: string }[];
};
type DownloadFile = { id: string; name: string; url: string };
type MatchStatus = Result | { status: 'waiting'; registrationExpiresAt: string };

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

export default function GuestPhotoSearch({ token, wedding }: { token: string; wedding: boolean }) {
  const endpoint = '/api/event-guest/' + token;
  const [selfie, setSelfie] = useState<File>();
  const [result, setResult] = useState<Result>();
  const [personalLink, setPersonalLink] = useState<string>();
  const [linkExpiresAt, setLinkExpiresAt] = useState<string>();
  const [loadingLink, setLoadingLink] = useState(true);
  const [waiting, setWaiting] = useState(false);
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

  const run = useCallback(async (callback: () => Promise<void>) => {
    setBusy(true);
    setStatus('');
    try {
      await callback();
    } catch (error) {
      setStatus(photoMessage(error));
    } finally {
      setBusy(false);
    }
  }, []);

  const findMatches = useCallback(async (accessKey: string) => {
    const matches = await photoRequest<MatchStatus>(endpoint, 'POST', { action: 'find', accessKey });
    setLinkExpiresAt(matches.registrationExpiresAt);
    setWaiting(matches.status === 'waiting');
    setResult(matches.status === 'found' ? matches : undefined);
    setExpired(false);
    setSelected([]);
  }, [endpoint]);

  const loadedLink = useRef(false);
  useEffect(() => {
    if (loadedLink.current) return;
    loadedLink.current = true;
    const accessKey = new URLSearchParams(window.location.hash.slice(1)).get('access');
    setLoadingLink(false);
    if (!accessKey || !/^[a-f0-9]{48}$/.test(accessKey)) return;
    setPersonalLink(accessKey);
    void run(() => findMatches(accessKey));
  }, [findMatches, run]);

  function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selfie || busy) {
      if (!busy) setStatus('Take or choose a selfie first.');
      return;
    }
    const file = selfie;
    const form = new FormData(event.currentTarget);
    void run(async () => {
      let photo;
      try {
        photo = await prepareSelfie(file);
      } catch (error) {
        if (!photoMimeTypes.includes(file.type) || file.size > maxSelfieBytes) throw error;
        photo = file;
      }
      form.set('selfie', photo, 'selfie.' + (photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg'));
      const registration = await photoRequest<{ accessKey: string; expiresAt: string }>(endpoint, 'POST', form);
      window.history.replaceState(null, '', '#access=' + registration.accessKey);
      setPersonalLink(registration.accessKey);
      setLinkExpiresAt(registration.expiresAt);
      setSelfie(undefined);
      await findMatches(registration.accessKey);
    });
  }

  function forget() {
    if (!personalLink || !window.confirm('Delete your saved selfie, registration details, and personal photo link?')) return;
    void run(async () => {
      await photoRequest(endpoint, 'POST', { action: 'forget', accessKey: personalLink });
      window.history.replaceState(null, '', window.location.pathname);
      dialog.current?.close();
      setPersonalLink(undefined);
      setLinkExpiresAt(undefined);
      setResult(undefined);
      setWaiting(false);
      setExpired(false);
      setSelected([]);
      setStatus('Your registration was deleted.');
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
    {!loadingLink && !personalLink && <form onSubmit={register} className={styles.narrow + ' ' + styles.card + ' ' + styles.stack}>
      <h2>Register for your event photos</h2>
      <p>Save your personal link and return after the photographer uploads the photos.</p>
      <label><span>Full name</span><input name="name" className="field" autoComplete="name" maxLength={100} required disabled={busy} /></label>
      <label><span>Phone number</span><input name="phone" type="tel" className="field" autoComplete="tel" maxLength={24} required disabled={busy} /></label>
      <label><span>Location (city or town)</span><input name="location" className="field" autoComplete="address-level2" maxLength={100} required disabled={busy} /></label>
      <label><span>{wedding ? 'Relationship to the groom (dulha)' : 'Relationship to the host'}</span><input name="relationship" className="field" maxLength={80} required disabled={busy} /></label>
      <label><span>Take a selfie</span><input type="file" className="field" accept="image/*" capture="user" onChange={event => setSelfie(event.currentTarget.files?.[0])} disabled={busy} /></label>
      <label><span>Or upload a saved selfie</span><input type="file" className="field" accept={photoMimeTypes.join(',')} onChange={event => setSelfie(event.currentTarget.files?.[0])} disabled={busy} /></label>
      {selfie && <small>Selected: {selfie.name}</small>}
      <p>Use a clear selfie with one face. PIC PRO keeps your registration and selfie private for {guestRegistrationDays} days and uses Amazon Rekognition to check for matching event photos. You can delete your registration from your personal link. Face matching can include incorrect results.</p>
      <label className={styles.check}><input required name="consent" value={consentVersion} type="checkbox" disabled={busy} />I am using my own selfie and consent to storing my registration and processing my selfie for this event.</label>
      <button type="submit" className={styles.primary} disabled={busy}>{busy ? 'Registering…' : 'Register for photos'}</button>
    </form>}
    {personalLink && <section className={styles.card + ' ' + styles.stack}>
      <h2>Your personal photo link</h2>
      <p>Copy this link so you can return after the event. Keep it private. Anyone with the link can view your matches.</p>
      {linkExpiresAt && <p>Available until {new Date(linkExpiresAt).toLocaleDateString()}.</p>}
      {waiting && <p role="status">The photographer’s photos are still pending. Come back here after the upload.</p>}
      <div className={styles.actions}>
        <button className={styles.secondary} type="button" disabled={busy} onClick={() => void run(async () => {
          await navigator.clipboard.writeText(window.location.href);
          setStatus('Personal link copied.');
        })}>Copy personal link</button>
        <button className={styles.primary} type="button" disabled={busy} onClick={() => void run(() => findMatches(personalLink))}>{busy ? 'Please wait…' : 'Check for photos'}</button>
        <button className={styles.secondary} type="button" disabled={busy} onClick={forget}>Delete registration</button>
      </div>
    </section>}
    {result && <section>
      <div className={styles.toolbar}>
        <h2>{expired ? 'Search expired' : result.photos.length + ' matching photos'}</h2>
        <button className={styles.secondary} type="button" disabled={busy} onClick={clear}>{expired ? 'Start a new search' : 'End search and clear session'}</button>
      </div>
      {!expired && <>
        {!result.photos.length && <p>No matches were found in the photos uploaded so far. Check back after the photographer finishes uploading.</p>}
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
