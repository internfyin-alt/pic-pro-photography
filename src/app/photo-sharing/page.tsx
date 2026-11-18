import Link from 'next/link';
import { images } from '@/lib/content';
import { features, steps } from './content';
import styles from './sharing.module.css';

export const metadata = {
  title: 'Event Photo Sharing',
  description: 'Private QR event galleries and selfie-based photo discovery for PIC PRO guests.',
};

export default function PhotoSharing() {
  return (
    <main className={styles.shell}>
      <div className="container">
        <section className={styles.hero}>
          <div>
            <div className={styles.brand}>PICPRO Videography</div>
            <h1>Your Memories, Just One Selfie Away.</h1>
            <p>Capture Every Moment. Find Every Memory.</p>
            <p>Share an event with a QR code and let guests find the photographs they’re in using a single selfie.</p>
            <div className={styles.actions}>
              <Link className={styles.primary} href="/photo-sharing/register">Get Started</Link>
              <Link className={styles.secondary} href="/photo-sharing/features">Explore Features</Link>
              <Link href="/photo-sharing/login">Photographer login</Link>
            </div>
          </div>
          <div className={styles.heroVisual} style={{ backgroundImage: 'url(' + images.couple + ')' }} role="img" aria-label="Wedding photography showcase" />
        </section>
        <section className={styles.section}>
          <h2>Every event, in focus</h2>
          <div className={styles.columns}>
            {[
              ['Weddings', images.wedding],
              ['Engagements', images.engagement],
              ['Celebrations', images.birthday],
            ].map(([label, image]) => <figure className={styles.showcase} key={label}>
              <img src={image} alt={label + ' photo showcase'} loading="lazy" />
              <figcaption>{label}</figcaption>
            </figure>)}
          </div>
        </section>
        <section className={styles.section}>
          <div className={styles.toolbar}>
            <h2>How It Works</h2>
            <Link href="/photo-sharing/how-it-works">See the full process</Link>
          </div>
          <div className={styles.columns}>
            {[steps[1], steps[2], steps[3]].map(([title, body]) => <article key={title} className={styles.card}><h3>{title}</h3><p>{body}</p></article>)}
          </div>
        </section>
        <section className={styles.section}>
          <div className={styles.columns}>
            <article className={styles.card}><h3>For photographers</h3><p>Manage uploads, access links and processing together.</p></article>
            <article className={styles.card}><h3>For guests</h3><p>Scan your event’s QR code, take a selfie and save your photos without creating an account.</p></article>
            <article className={styles.card}><h3>Privacy and access</h3><p>{features[5][1]} A selfie is processed in memory, and guests can end their matching session at any time.</p></article>
          </div>
        </section>
        <section className={styles.section}>
          <h2>Frequently Asked Questions</h2>
          <details className={styles.details}><summary>How do I open my event gallery?</summary><p>Scan the QR code supplied by your photographer. Each code is specific to one event.</p></details>
          <details className={styles.details}><summary>What happens to my selfie?</summary><p>It is sent to the face-matching service for this search. PIC PRO does not save it in the event gallery or database.</p></details>
          <details className={styles.details}><summary>Why might a photo be missing?</summary><p>Lighting, pose, image quality and ongoing uploads can affect the results. Ask your photographer for help locating a missing photo.</p></details>
        </section>
        <section className={styles.section}>
          <h2>Contact PIC PRO</h2>
          <Link href="/contact" className={styles.secondary}>Contact us</Link>
        </section>
      </div>
    </main>
  );
}
