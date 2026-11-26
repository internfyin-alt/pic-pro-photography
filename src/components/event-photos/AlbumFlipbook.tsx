'use client';

import { useEffect, useState } from 'react';
import { photoMessage, photoRequest } from '@/lib/event-photos/client';
import { photoPageSize } from '@/lib/event-photos/constants';
import styles from '@/app/photo-sharing/studio/Studio.module.css';

type AlbumPage = { photos: { id: string; file_name: string }[]; total: number };

export default function AlbumFlipbook({ eventId }: { eventId: string }) {
  const [page, setPage] = useState(0);
  const [photo, setPhoto] = useState<{ url: string; name: string; page: number }>();
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('Loading album…');

  useEffect(() => {
    let active = true;
    const api = '/api/photo-events/' + eventId;
    async function load() {
      try {
        const listing = await photoRequest<AlbumPage>(api + '?filter=ready&page=' + Math.floor(page / photoPageSize), 'GET');
        if (!active) return;
        setTotal(listing.total);
        const entry = listing.photos[page % photoPageSize];
        if (!entry) {
          setStatus(listing.total ? 'This album page is unavailable. Go back to another page.' : 'Indexed photos will appear here once the upload is processed.');
          return;
        }
        const view = await photoRequest<{ url: string }>(api, 'POST', { action: 'view', photoId: entry.id, download: false });
        if (!active) return;
        setPhoto({ url: view.url, name: entry.file_name, page });
        setStatus('');
      } catch (error) {
        if (active) setStatus(photoMessage(error));
      }
    }
    void load();
    return () => { active = false; };
  }, [eventId, page]);

  function turn(next: number) {
    setStatus('Loading album page…');
    setPage(next);
  }

  return <section className={styles.panel + ' ' + styles.album} aria-label="Album pages">
    <div role="status">{status}</div>
    {photo?.page === page && <figure>
      <img src={photo.url} alt={photo.name} referrerPolicy="no-referrer" />
      <figcaption>{photo.name}</figcaption>
    </figure>}
    {!!total && <div className={styles.actions}>
      <button type="button" className={styles.secondary} onClick={() => turn(page - 1)} disabled={page === 0}>Previous photo</button>
      <span>Page {page + 1} of {total}</span>
      <button type="button" className={styles.secondary} onClick={() => turn(page + 1)} disabled={page + 1 >= total}>Next photo</button>
    </div>}
  </section>;
}
