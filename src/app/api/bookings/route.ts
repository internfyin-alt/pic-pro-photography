import { NextResponse } from 'next/server';
import { eventRequestSchema } from '@/lib/validation';
import { supabaseServer, configured } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const parsed = eventRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Please check the form fields.' }, { status: 400 });

    const { website, ...details } = parsed.data;
    if (website) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    if (!configured()) {
      return NextResponse.json({ error: 'Booking database not configured yet. Add Supabase keys to .env.local and apply migrations.' }, { status: 503 });
    }

    const db = await supabaseServer();
    const reference = 'PIC-' + crypto.randomUUID().slice(0, 8).toUpperCase();
    const { error } = await db.from('bookings').insert({
      ...details,
      booking_reference: reference,
      status: 'new',
    });
    if (error) {
      console.error('Booking insert failed', error.code);
      return NextResponse.json({ error: 'Unable to save your booking. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ reference }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
