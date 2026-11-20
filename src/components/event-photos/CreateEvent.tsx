'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { eventTypes } from '@/lib/event-photos/constants';
import { photoMessage, photoRequest } from '@/lib/event-photos/client';
import styles from '@/components/workspace/Workspace.module.css';

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
      });
      router.push('/photo-sharing/studio/' + result.id);
    } catch (error) {
      setStatus(photoMessage(error));
      setBusy(false);
    }
  }

  return <form className={styles.stack} onSubmit={create}>
    <label className={styles.fieldLabel}>Event name<input className="field" name="title" minLength={2} maxLength={100} required /></label>
    <label className={styles.fieldLabel}>Event type<select className="field" name="type" required>{eventTypes.map(type => <option key={type}>{type}</option>)}</select></label>
    <label className={styles.fieldLabel}>Event date (optional)<input type="date" className="field" name="date" /></label>
    <label className={styles.checkbox}><input type="checkbox" name="permission" required />I have permission to upload these photos and use face matching for this event.</label>
    <button type="submit" className={styles.primary} disabled={busy}>{busy ? 'Creating…' : 'Create event'}</button>
    {status && <p role="status">{status}</p>}
  </form>;
}
