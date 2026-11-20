'use server';

import { redirect } from 'next/navigation';
import { configured, supabaseServer } from '@/lib/supabase';

export async function login(form: FormData) {
  const isAdmin = form.get('role') !== 'client';
  if (!configured()) redirect(isAdmin ? '/admin/login?error=configure' : '/client/login');

  const db = await supabaseServer();
  const { data, error } = await db.auth.signInWithPassword({
    email: String(form.get('email')).trim(),
    password: String(form.get('password')),
  });
  if (error) redirect(isAdmin ? '/admin/login?error=invalid' : '/client/login');
  if (!isAdmin) redirect('/client/dashboard');

  const { data: profile, error: profileError } = await db.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  if (profile?.role !== 'admin') {
    await db.auth.signOut({ scope: 'local' });
    redirect(profileError ? '/admin/login?error=configure' : '/admin/login?error=access');
  }
  redirect('/admin');
}

export async function logout() {
  const db = await supabaseServer();
  await db.auth.signOut();
  redirect('/');
}
