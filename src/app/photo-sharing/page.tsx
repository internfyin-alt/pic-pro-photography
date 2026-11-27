import Link from 'next/link';
import { publicMetadata } from '@/lib/seo';
import styles from './sharing.module.css';

export const metadata = publicMetadata('/photo-sharing');

export default function PhotoSharing() {
  return (
    <main className={styles.shell}>
      <div className={`container ${styles.landing}`}>
        <h1>Photo Sharing</h1>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/photo-sharing/register">Photographer Sign Up</Link>
          <Link className={styles.secondary} href="/photo-sharing/login">Photographer Login</Link>
        </div>
      </div>
    </main>
  );
}
