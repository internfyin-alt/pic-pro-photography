import { z } from 'zod';
import { audit, dbRequired, photoActor, photoFailure, photoJson, PhotoError, secretToken } from '@/lib/event-photos/server';
import { eventDetails } from '@/lib/event-photos/validation';

const eventInput = eventDetails.extend({ permission: z.literal(true) });

export async function POST(request: Request) {
  try {
    const { db, user, owner } = await photoActor();
    if (!owner || owner.suspended) throw new PhotoError('Set up a photographer profile first.', 403);
    const result = eventInput.safeParse(await request.json());
    if (!result.success) throw new PhotoError('Enter valid event details and confirm that you have permission to process the photos.');
    const input = result.data;
    const event = dbRequired(await db.from('photo_events').insert({
      owner_id: user.id, title: input.title, event_type: input.eventType,
      event_date: input.eventDate || null, share_token: secretToken(),
    }).select('id').single());
    await audit(db, 'event.created', event.id, user.id);
    return photoJson(event, 201);
  } catch (error) {
    return photoFailure(error);
  }
}
