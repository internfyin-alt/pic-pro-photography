'use client';

import { useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import styles from './Workspace.module.css';

function Submit({ register }: { register: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className={`${styles.primary} ${styles.fullWidth}`} disabled={pending} type="submit">
      {pending ? (register ? 'Creating account…' : 'Signing in…') : (register ? 'Create account' : 'Sign in')}
    </button>
  );
}

export default function SignInForm({ action, register = false, message, children }: {
  action: (data: FormData) => Promise<void>;
  register?: boolean;
  message?: string;
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <form action={action} className={styles.stack}>
      {children}
      <label className={styles.fieldLabel}>
        Email address
        <input className="field" name="email" type="email" autoComplete="username" required />
      </label>
      <div className={styles.password}>
        <label className={styles.fieldLabel}>
          Password
          <input className="field" name="password" type={visible ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : undefined} maxLength={128} required />
        </label>
        <button type="button" className={styles.secondary} aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)}>
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {message && <p className={styles.notice} role="status">{message}</p>}
      <Submit register={register} />
    </form>
  );
}
