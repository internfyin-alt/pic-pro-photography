import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './Workspace.module.css';

export default function SignInPanel({ role, title, description, children }: {
  role: 'admin' | 'photographer';
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className={styles.workspace}>
      <div className="container">
        <div className={styles.narrow}>
          <nav className={styles.roleLinks} aria-label="Staff sign-in options">
            <Link href="/admin/login" aria-current={role === 'admin' ? 'true' : undefined}>Admin</Link>
            <Link href="/photo-sharing/login" aria-current={role === 'photographer' ? 'true' : undefined}>Photographer</Link>
          </nav>
          <div className={styles.panel}>
            <div className={styles.intro}><h1>{title}</h1><p>{description}</p></div>
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
