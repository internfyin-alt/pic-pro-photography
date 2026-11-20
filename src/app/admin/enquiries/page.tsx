import { requireRole } from '@/lib/auth';
import AdminTable from '@/components/AdminTable';
import AdminPage from '@/components/workspace/AdminPage';

export default async function Page() {
  const { db } = await requireRole('admin');
  const { data, error } = await db.from('enquiries').select('*').order('created_at', { ascending: false }).limit(100);
  return (
    <AdminPage title="Enquiries" description="Read customer messages and track your follow-ups.">
      {error ? <p role="alert">Could not load these records. Refresh the page to try again.</p> : <AdminTable table="enquiries" initial={data ?? []} />}
    </AdminPage>
  );
}
