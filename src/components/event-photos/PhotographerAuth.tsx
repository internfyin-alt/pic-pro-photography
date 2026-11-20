import Link from 'next/link';
import { photographerAuth } from '@/app/photo-sharing/actions';
import SignInForm from '@/components/workspace/SignInForm';
import SignInPanel from '@/components/workspace/SignInPanel';
import styles from '@/components/workspace/Workspace.module.css';

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
  return (
    <SignInPanel role="photographer"
      title={register ? 'Create a photographer account' : 'Photographer sign in'}
      description={register ? 'Set up your studio to share event photos with guests.' : 'Create events, upload photos and share them with your guests.'}>
      <div className={styles.stack}>
        <SignInForm action={photographerAuth} register={register} message={status && Object.hasOwn(messages, status) ? messages[status] : undefined}>
          <input type="hidden" name="intent" value={register ? 'register' : 'login'} />
          {register && <label className={styles.fieldLabel}>Name or studio name<input className="field" name="name" autoComplete="name" required minLength={2} maxLength={100} /></label>}
        </SignInForm>
        <div className={styles.help}>
          <Link className={styles.textLink} href={register ? '/photo-sharing/login' : '/photo-sharing/register'}>{register ? 'Already registered? Sign in' : 'Create an account'}</Link>
          {!register && <Link className={styles.textLink} href="/photo-sharing/reset">Forgot password?</Link>}
        </div>
      </div>
    </SignInPanel>
  );
}
