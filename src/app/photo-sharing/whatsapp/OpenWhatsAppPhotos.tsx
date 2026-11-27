'use client';

import { useEffect, useState } from 'react';
import styles from '../sharing.module.css';

export default function OpenWhatsAppPhotos() {
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const link = new URLSearchParams(window.location.hash.slice(1)).get('link');
    if (!link || !/^[a-f0-9]{176}$/.test(link)) {
      setInvalid(true);
      return;
    }
    window.location.replace('/photo-sharing/g/' + link.slice(0, 48) + '#access=' + link.slice(48));
  }, []);

  return <main className={styles.shell}><div className="container" role="status">
    <h1>{invalid ? 'Photo link unavailable' : 'Opening your event photos'}</h1>
    {invalid && <p>Open the full link from your WhatsApp message or use the photographer’s event QR code.</p>}
  </div></main>;
}
