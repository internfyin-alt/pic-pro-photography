import type { ReactNode } from 'react';
import AdminNav from '@/components/AdminNav';
import styles from './Workspace.module.css';

export default function AdminPage({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <main className={styles.workspace}>
      <div className="container">
        <AdminNav />
        <div className={styles.intro}>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}
