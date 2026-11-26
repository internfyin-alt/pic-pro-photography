import { publicMetadata } from '@/lib/seo';
import Link from 'next/link';
import { features } from '../content';
import styles from '../sharing.module.css';

export const metadata = publicMetadata('/photo-sharing/features');

export default function Features() {
  return <main className={styles.shell}><div className="container">
    <Link href="/photo-sharing">Event Photo Sharing</Link>
    <h1>Photo Sharing Features</h1>
    <div className={styles.columns}>{features.map(([title, body]) => <article className={styles.card} key={title}><h3>{title}</h3><p>{body}</p></article>)}</div>
    <div className={styles.section}><Link href="/photo-sharing/how-it-works" className={styles.primary}>How It Works</Link></div>
  </div></main>;
}
