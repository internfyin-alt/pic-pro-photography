import { NextResponse } from 'next/server';
import { eventRequestSchema } from '@/lib/validation';
import { supabaseServer, configured } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const parsed = eventRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Please check the form fields.' }, { status: 400 });

    const { website, full_name, ...details } = parsed.data;
    if (website) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    if (!configured()) {
      return NextResponse.json({ error: 'Contact database not configured. Add Supabase credentials.' }, { status: 503 });
    }

    const db = await supabaseServer();
    const { error } = await db.from('enquiries').insert({
      ...details,
      name: full_name,
      status: 'new',
    });
    if (error) return NextResponse.json({ error: 'Unable to save enquiry' }, { status: 500 });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
