import Link from 'next/link';
import { steps } from '../content';
import styles from '../sharing.module.css';

export const metadata = { title: 'How Event Photo Sharing Works' };

export default function HowItWorks() {
  return <main className={styles.shell}><div className="container">
    <Link href="/photo-sharing">Event Photo Sharing</Link>
    <h1>How It Works</h1>
    <ol className={styles.stack}>{steps.map(([title, body]) => <li className={styles.card} key={title}><h3>{title}</h3><p>{body}</p></li>)}</ol>
    <div className={styles.section}><Link href="/photo-sharing/register" className={styles.primary}>Get Started</Link></div>
  </div></main>;
}
