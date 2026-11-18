import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseServer, configured } from '@/lib/supabase';
import { changePassword, requestPasswordReset } from '../actions';
import styles from '../sharing.module.css';

export const metadata = { title: 'Photographer Password Reset', robots: { index: false } };

export default async function Reset({ searchParams }: { searchParams: Promise<{ mode?: string; status?: string }> }) {
  const { mode, status } = await searchParams;
  const changing = mode === 'change';
  const ready = configured();
  if (changing && ready) {
    const db = await supabaseServer();
    const { data: { user } } = await db.auth.getUser();
    if (!user) redirect('/photo-sharing/reset');
  }

  return <main className={styles.shell}><div className="container"><div className={styles.narrow}>
    <Link href="/photo-sharing/login">Photographer Login</Link>
    <h1>{changing ? 'Change your password' : 'Reset your password'}</h1>
    {!ready ? <p>Photographer accounts are awaiting setup.</p> : <form action={changing ? changePassword : requestPasswordReset} className={styles.card + ' ' + styles.stack}>
      {changing ? <>
        <label><span>New password</span><input name="password" type="password" className="field" autoComplete="new-password" minLength={8} maxLength={128} required /></label>
        <label><span>Confirm new password</span><input name="confirmation" type="password" className="field" autoComplete="new-password" minLength={8} maxLength={128} required /></label>
      </> : <label><span>Email address</span><input name="email" type="email" className="field" autoComplete="email" required /></label>}
      {status && <p role="status">{status === 'sent' ? 'If this address is registered, a reset link will be sent.' : 'Check the details and try again.'}</p>}
      <button type="submit" className={styles.primary}>{changing ? 'Save new password' : 'Send reset link'}</button>
    </form>}
  </div></div></main>;
}
