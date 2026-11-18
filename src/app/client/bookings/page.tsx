import { requireRole } from '@/lib/auth';

export default async function Page() {
  const { db, user } = await requireRole('client');
  const { data } = await db.from('bookings')
    .select('booking_reference,event_type,event_date,status')
    .eq('client_id', user.id);

  return (
    <main className="section container">
      <h1 className="heading">My Bookings</h1>
      {(data || []).map(booking => (
        <div key={booking.booking_reference} className="card" style={{ padding: 25, margin: 12 }}>
          {[booking.booking_reference, booking.event_type, booking.event_date, booking.status].filter(Boolean).join(' · ')}
        </div>
      ))}
    </main>
  );
}
