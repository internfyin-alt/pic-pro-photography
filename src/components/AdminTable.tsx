"use client";

import { useState } from 'react';

const bookingStatuses = ['new', 'contacted', 'quoted', 'confirmed', 'in_progress', 'completed', 'cancelled'];
const enquiryStatuses = ['new', 'contacted', 'closed'];

export default function AdminTable({ table, initial }: { table: string; initial: Record<string, unknown>[] }) {
  const [rows, setRows] = useState(initial);
  const [error, setError] = useState('');
  const statuses = table === 'bookings' ? bookingStatuses : table === 'enquiries' ? enquiryStatuses : null;
  const showEmail = !statuses || rows.some(row => row.email);
  const headings = ['Created', 'Name / Title'];
  if (showEmail) headings.push('Email');
  if (statuses) headings.push('Phone Number', 'Event Type', 'Event City', 'Event Location');
  headings.push('Status', 'Action');

  async function update(id: string, status: string) {
    const response = await fetch('/api/admin/update', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ table, id, status }),
    });
    if (response.ok) setRows(current => current.map(row => row.id === id ? { ...row, status } : row));
    else setError('Update failed');
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      {error && <p>{error}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {headings.map(heading => (
              <th key={heading} style={{ padding: 15, textAlign: 'left', borderBottom: '1px solid #555' }}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={String(row.id)}>
              <td style={{ padding: 12 }}>{String(row.created_at || '').slice(0, 10)}</td>
              <td>{String(row.full_name || row.name || row.title || row.booking_reference || '—')}</td>
              {showEmail && <td>{String(row.email || '—')}</td>}
              {statuses && (
                <>
                  <td>{String(row.phone || '—')}</td>
                  <td>{String(row.event_type || '—')}</td>
                  <td>{String(row.city || '—')}</td>
                  <td>{String(row.event_location || '—')}</td>
                </>
              )}
              <td>{String(row.status || '—')}</td>
              <td>
                {statuses && (
                  <select
                    className="field"
                    aria-label="Status"
                    style={{ minWidth: 130 }}
                    value={String(row.status || 'new')}
                    onChange={event => update(String(row.id), event.target.value)}
                  >
                    {statuses.map(status => <option key={status}>{status}</option>)}
                  </select>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="muted">No records yet.</p>}
    </div>
  );
}
