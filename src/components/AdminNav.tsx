'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/admin/login-action';
import styles from './workspace/Workspace.module.css';

const primary = [
  ['/admin', 'Overview'],
  ['/admin/bookings', 'Bookings'],
  ['/admin/enquiries', 'Enquiries'],
  ['/admin/photo-sharing', 'Photo sharing'],
];
const groups = [
  { label: 'Clients & galleries', items: [['clients', 'Clients'], ['client-galleries', 'Client galleries']] },
  { label: 'Website content', items: [
    ['services', 'Services'], ['packages', 'Packages'], ['portfolio', 'Portfolio albums'],
    ['gallery', 'Gallery images'], ['videos', 'Videos'], ['testimonials', 'Testimonials'],
    ['blog', 'Blog'], ['settings', 'Site settings'],
  ] },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Admin panel">
      {primary.map(([href, label]) => (
        <Link key={href} href={href} className={styles.secondary} aria-current={pathname === href ? 'page' : undefined}>{label}</Link>
      ))}
      {groups.map(({ label, items }) => (
        <details className={styles.menu} key={`${label}-${pathname}`}>
          <summary className={styles.secondary}>{label}</summary>
          <div className={styles.menuLinks}>
            {items.map(([slug, name]) => (
              <Link key={slug} href={`/admin/${slug}`} aria-current={pathname === `/admin/${slug}` ? 'page' : undefined}>{name}</Link>
            ))}
          </div>
        </details>
      ))}
      <form action={logout}><button className={styles.secondary} type="submit">Sign out</button></form>
    </nav>
  );
}
