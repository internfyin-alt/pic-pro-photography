import { requireRole } from '@/lib/auth';
import AdminTable from '@/components/AdminTable';
import AdminPage from '@/components/workspace/AdminPage';

export default async function Page() {
  const { db } = await requireRole('admin');
  const { data, error } = await db.from('testimonials').select('*').limit(100);
  return (
    <AdminPage title="Testimonials" description="View up to 100 records. Edit these records in Supabase Studio.">
      {error ? <p role="alert">Could not load these records. Refresh the page to try again.</p> : <AdminTable table="testimonials" initial={data ?? []} />}
    </AdminPage>
  );
}
