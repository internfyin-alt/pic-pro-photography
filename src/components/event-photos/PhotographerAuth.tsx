import Link from 'next/link';
import { photographerAuth } from '@/app/photo-sharing/actions';
import styles from '@/app/photo-sharing/sharing.module.css';

const messages: Record<string, string> = {
  invalid: 'Check that you filled in all the required fields.',
  email: 'If this is a new account, check your email for a confirmation link. If you already have an account, sign in below.',
  unconfirmed: 'Open the confirmation link in your email, then sign in again.',
  credentials: 'The email or password is incorrect. Try again or reset your password.',
  'weak-password': 'Choose a stronger password with at least eight characters.',
  'invalid-email': 'Enter a valid email address where you can receive a confirmation link.',
  'email-restricted': 'This site’s email service cannot send a confirmation to this address. Contact PIC PRO for account setup.',
  'signup-disabled': 'Photographer registration is paused. Existing photographers can still sign in.',
  'rate-limited': 'Too many attempts. Wait a few minutes before trying again.',
  'signup-failed': 'Unable to create the account. If you already have a PIC PRO account, sign in below.',
  'login-failed': 'Unable to sign in. Try again or use the password reset link below.',
  unavailable: 'The account service is temporarily unavailable. Try again shortly.',
  verify: 'This confirmation link has expired or could not be verified. Try signing in or request a new confirmation.',
  setup: 'Photographer accounts are awaiting database setup.',
  reset: 'Password updated. Sign in with your new password.',
};

export default function PhotographerAuth({ register = false, status }: { register?: boolean; status?: string }) {
  return <main className={styles.shell}><div className="container"><div className={styles.narrow}>
    <Link href="/photo-sharing">Event Photo Sharing</Link>
    <h1>{register ? 'Create a photographer account' : 'Photographer Login'}</h1>
    <form className={styles.card + ' ' + styles.stack} action={photographerAuth}>
      <input type="hidden" name="intent" value={register ? 'register' : 'login'} />
      {register && <label><span>Name or studio name</span><input className="field" name="name" autoComplete="name" required minLength={2} maxLength={100} /></label>}
      <label><span>Email address</span><input className="field" name="email" type="email" autoComplete="email" required /></label>
      <label><span>Password</span><input className="field" name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : undefined} maxLength={128} required /></label>
      {status && messages[status] && <p role="status">{messages[status]}</p>}
      <button className={styles.primary} type="submit">{register ? 'Create account' : 'Sign in'}</button>
    </form>
    <p><Link href={register ? '/photo-sharing/login' : '/photo-sharing/register'}>{register ? 'Already registered? Sign in' : 'Create a photographer account'}</Link></p>
    {!register && <p><Link href="/photo-sharing/reset">Forgot your password?</Link></p>}
  </div></div></main>;
}
