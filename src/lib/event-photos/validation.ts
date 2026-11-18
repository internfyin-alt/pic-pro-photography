import { z } from 'zod';
import { eventTypes } from './constants';

export const eventDetails = z.object({
  title: z.string().trim().min(2).max(100),
  eventType: z.string().refine(value => eventTypes.includes(value)),
  eventDate: z.union([z.literal(''), z.string().date()]),
});
