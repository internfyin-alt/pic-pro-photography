import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { requestUrl } from '@/lib/event-photos/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (code) {
    const db = await supabaseServer();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination = url.searchParams.get('flow') === 'recovery' ? '/photo-sharing/reset?mode=change' : '/photo-sharing/studio';
      return NextResponse.redirect(requestUrl(destination, url.origin));
    }
  }
  return NextResponse.redirect(requestUrl('/photo-sharing/login?status=verify', url.origin));
}
