'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus } from 'lucide-react';
import { eventTypes } from '@/lib/event-photos/constants';
import { photoMessage, photoRequest } from '@/lib/event-photos/client';
import styles from '@/app/photo-sharing/studio/Studio.module.css';
import GallerySettings, { readGallerySettings } from './GallerySettings';

export default function CreateEvent() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setStatus('');
    try {
      const result = await photoRequest<{ id: string }>('/api/photo-events', 'POST', {
        title: form.get('title'), eventDate: form.get('date'), eventType: form.get('type'),
        permission: form.get('permission') === 'on',
        ...readGallerySettings(form),
      });
      router.push('/photo-sharing/studio/' + result.id);
    } catch (error) {
      setStatus(photoMessage(error));
      setBusy(false);
    }
  }

  return <form className={styles.galleryForm} onSubmit={create}>
    <fieldset className={styles.formSection}>
      <legend>Event details</legend>
      <div className={styles.formGrid}>
        <label className={styles.fieldLabel}>Couple/Event Name
          <input className="field" name="title" minLength={2} maxLength={100} required />
        </label>
        <label className={styles.fieldLabel}>Event date (optional)
          <input type="date" className="field" name="date" />
        </label>
        <label className={styles.fieldLabel}>Event type
          <select className="field" name="type" required>
            {eventTypes.map(type => <option key={type}>{type}</option>)}
          </select>
        </label>
      </div>
    </fieldset>
    <fieldset className={styles.formSection}>
      <legend>Gallery setup</legend>
      <GallerySettings />
      <label className={styles.permission}>
        <input type="checkbox" name="permission" required />
        <span>I have permission to upload these photos and use face matching for this event.</span>
      </label>
    </fieldset>
    <div className={styles.formActions}>
      {status && <p role="status">{status}</p>}
      <button type="submit" className={styles.primary} disabled={busy}>
        <CalendarPlus size={18} aria-hidden="true" />{busy ? 'Creating…' : 'Create New Gallery'}
      </button>
    </div>
  </form>;
}
