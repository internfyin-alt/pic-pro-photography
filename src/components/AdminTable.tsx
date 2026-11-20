'use client';

import { useState } from 'react';
import styles from './workspace/Workspace.module.css';

type Row = Record<string, unknown>;

const bookingStatuses = ['new', 'contacted', 'quoted', 'confirmed', 'in_progress', 'completed', 'cancelled'];
const enquiryStatuses = ['new', 'contacted', 'closed'];

function label(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll('_', ' ');
}

function RequestCard({ row, table, statuses }: { row: Row; table: string; statuses: string[] }) {
  const [status, setStatus] = useState(String(row.status ?? 'new'));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const name = String(row.full_name || row.name || 'Customer');
  const details = [
    ['Email', row.email], ['Phone', row.phone], ['WhatsApp', row.whatsapp], ['Event', row.event_type],
    ['Service', row.service], ['Event date', row.event_date], ['City', row.city], ['Location', row.event_location],
    ['Budget', row.estimated_budget], ['Reference', row.booking_reference],
  ];

  async function update(nextStatus: string) {
    setPending(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ table, id: row.id, status: nextStatus }),
      });
      if (!response.ok || response.redirected || !(await response.json()).ok) throw new Error();
      setStatus(nextStatus);
      setMessage('Status saved.');
    } catch {
      setMessage('Could not save the status. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <article className={`${styles.panel} ${styles.stack}`}>
      <div className={styles.toolbar}>
        <div><h2>{name}</h2><p>Received {String(row.created_at ?? '').slice(0, 10) || 'on an unknown date'}</p></div>
        <label className={styles.fieldLabel}>
          Status
          <select className="field" value={status} disabled={pending} onChange={event => void update(event.target.value)}>
            {statuses.map(option => <option key={option} value={option}>{label(option)}</option>)}
          </select>
        </label>
      </div>
      {(pending || message) && <p role="status">{pending ? 'Saving status…' : message}</p>}
      <dl className={styles.requestMeta}>
        {details.map(([term, value]) => value ? <div key={String(term)}><dt>{String(term)}</dt><dd>{String(value)}</dd></div> : null)}
      </dl>
      {Boolean(row.message || row.requirements) && (
        <details className={styles.disclosure}>
          <summary>{row.message ? 'Read message' : 'View requirements'}</summary>
          <dl className={styles.requestMeta}>
            {Boolean(row.message) && <div><dt>Message</dt><dd>{String(row.message)}</dd></div>}
            {Boolean(row.requirements) && <div><dt>Requirements</dt><dd>{String(row.requirements)}</dd></div>}
          </dl>
        </details>
      )}
    </article>
  );
}

export default function AdminTable({ table, initial }: { table: string; initial: Row[] }) {
  const statuses = table === 'bookings' ? bookingStatuses : table === 'enquiries' ? enquiryStatuses : null;
  if (!initial.length) return <p className={styles.panel}>No records yet.</p>;
  if (statuses) {
    return (
      <div className={styles.stack}>
        {initial.map(row => <RequestCard key={String(row.id)} row={row} table={table} statuses={statuses} />)}
        {initial.length === 100 && <p>Showing the 100 most recent requests.</p>}
      </div>
    );
  }

  const showEmail = initial.some(row => row.email);
  const showStatus = initial.some(row => row.status || row.role || typeof row.is_published === 'boolean' || typeof row.is_active === 'boolean' || typeof row.is_approved === 'boolean');

  return (
    <div className={`${styles.panel} ${styles.tableWrap}`}>
      <table className={styles.table}>
        <thead><tr><th scope="col">Date</th><th scope="col">Name / Title</th>{showEmail && <th scope="col">Email</th>}{showStatus && <th scope="col">Status</th>}</tr></thead>
        <tbody>
          {initial.map(row => {
            const status = row.status || row.role || (
              typeof row.is_published === 'boolean' ? (row.is_published ? 'Published' : 'Draft') :
              typeof row.is_active === 'boolean' ? (row.is_active ? 'Active' : 'Inactive') :
              typeof row.is_approved === 'boolean' ? (row.is_approved ? 'Approved' : 'Pending approval') : ''
            );
            return (
              <tr key={String(row.id)}>
                <td>{String(row.created_at || row.updated_at || '').slice(0, 10) || '—'}</td>
                <td>{String(row.full_name || row.name || row.title || row.client_name || row.alt_text || row.storage_path || row.setting_key || '—')}</td>
                {showEmail && <td>{String(row.email || '—')}</td>}
                {showStatus && <td>{status ? label(String(status)) : '—'}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
