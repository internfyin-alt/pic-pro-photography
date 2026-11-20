import { requireRole } from '@/lib/auth';
import AdminTable from '@/components/AdminTable';
import AdminPage from '@/components/workspace/AdminPage';

export default async function Page() {
  const { db } = await requireRole('admin');
  const { data, error } = await db.from('bookings').select('*').order('created_at', { ascending: false }).limit(100);
  return (
    <AdminPage title="Bookings" description="Review shoot requests and update their status.">
      {error ? <p role="alert">Could not load these records. Refresh the page to try again.</p> : <AdminTable table="bookings" initial={data ?? []} />}
    </AdminPage>
  );
}
