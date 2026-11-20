import SignInForm from '@/components/workspace/SignInForm';
import SignInPanel from '@/components/workspace/SignInPanel';
import { login } from '../login-action';

export const metadata = { title: 'Admin Sign In', robots: { index: false } };

const messages: Record<string, string> = {
  configure: 'Admin sign-in is unavailable. Contact the site owner for help.',
  invalid: 'Check your admin email and password, then try again.',
  access: 'This account does not have admin access. Use your admin account to continue.',
};

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <SignInPanel role="admin" title="Admin sign in" description="Manage bookings, enquiries and photo sharing for PIC PRO.">
      <SignInForm action={login} message={error && Object.hasOwn(messages, error) ? messages[error] : undefined}>
        <input type="hidden" name="role" value="admin" />
      </SignInForm>
    </SignInPanel>
  );
}
