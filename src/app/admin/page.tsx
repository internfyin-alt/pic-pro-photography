import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import AdminPage from '@/components/workspace/AdminPage';
import styles from '@/components/workspace/Workspace.module.css';

export const metadata = { title: 'Admin Panel', robots: { index: false } };

export default async function Page() {
  const { db } = await requireRole('admin');
  const [bookings, enquiries] = await Promise.all([
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    db.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'new'),
  ]);
  const tasks = [
    { href: '/admin/bookings', label: 'Bookings', text: 'Review shoot requests and update their status.', count: bookings.count },
    { href: '/admin/enquiries', label: 'Enquiries', text: 'Read messages and track your follow-ups.', count: enquiries.count },
    { href: '/admin/photo-sharing', label: 'Photo sharing', text: 'Manage photographers, events and guest access.' },
  ];

  return (
    <AdminPage title="Admin panel">
      <div className={styles.tiles}>
        {tasks.map(({ href, label, text, count }) => (
          <Link className={`${styles.panel} ${styles.tile}`} key={href} href={href}>
            <h2>{label}</h2>
            <p>{text}</p>
            {typeof count === 'number' && <strong>{count} new</strong>}
          </Link>
        ))}
      </div>
    </AdminPage>
  );
}
