'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';
import styles from './Studio.module.css';

export default function ShareDirectoryLink({ url }: { url: string }) {
  const [message, setMessage] = useState('');

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage('All-events link copied.');
    } catch {
      setMessage('Select the link above to copy it.');
    }
  }

  return <div className={styles.shareLink}>
    <label htmlFor="all-events-link">All-events link</label>
    <div className={styles.actions}>
      <input id="all-events-link" className="field" value={url} readOnly
        onFocus={event => event.currentTarget.select()} />
      <button type="button" className={styles.secondary} onClick={copy}>
        <Copy size={17} aria-hidden="true" />Copy link
      </button>
    </div>
    <p role="status">{message}</p>
  </div>;
}
