'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { photoMessage, photoRequest } from '@/lib/event-photos/client';

export default function GalleryDelete({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function remove() {
    if (!window.confirm('Permanently delete “' + title + '” and all its photos?')) return;
    setBusy(true);
    setError('');
    try {
      await photoRequest('/api/photo-events/' + id, 'DELETE');
    } catch (error) {
      setError(photoMessage(error));
    } finally {
      router.refresh();
      setBusy(false);
    }
  }

  return <>
    <button type="button" onClick={remove} disabled={busy} aria-label={'Delete ' + title} title="Delete gallery">
      <Trash2 size={17} />
    </button>
    {error && <small role="alert">{error}</small>}
  </>;
}
