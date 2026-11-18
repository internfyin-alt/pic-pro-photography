"use client";

import { useState, type FormEvent } from 'react';

const eventTypes = ['Wedding', 'Pre-Wedding', 'Engagement', 'Birthday', 'Anniversary', 'Corporate', 'Maternity', 'Other'];

export default function BookingForm({ contact = false }: { contact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setResult('');

    try {
      const response = await fetch(contact ? '/api/enquiries' : '/api/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Submission failed');
      setResult(contact ? 'Thank you! Your enquiry has been received.' : 'Request received! Reference: ' + data.reference);
      form.reset();
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 30, maxWidth: 850, margin: 'auto' }}>
      <div className="grid2">
        <label>
          Full Name *
          <input className="field" name="full_name" autoComplete="name" required minLength={2} maxLength={120} placeholder="Your full name" />
        </label>
        <label>
          Phone Number *
          <input className="field" name="phone" type="tel" autoComplete="tel" required minLength={10} maxLength={25} placeholder="Your phone number" />
        </label>
        <label>
          Event Type *
          <select className="field" name="event_type" required>
            <option value="">Select event</option>
            {eventTypes.map(type => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label>
          Event City *
          <input className="field" name="city" required minLength={2} maxLength={120} placeholder="City" />
        </label>
        <label>
          Event Location *
          <input className="field" name="event_location" required maxLength={300} placeholder="Venue or locality" />
        </label>
      </div>
      <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
        <input name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <p className="muted" style={{ margin: '20px 0', fontSize: 13 }}>We’ll use your phone number to respond to your request.</p>
      <button disabled={busy} className="btn" type="submit">{busy ? 'Sending...' : 'Send Request'}</button>
      {result && <p role="status" style={{ marginTop: 20, color: '#f58b22' }}>{result}</p>}
    </form>
  );
}
