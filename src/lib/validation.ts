import { z } from 'zod';

export const eventRequestSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(10).max(25).regex(/^\+?[\d\s().-]+$/)
    .refine(phone => phone.replace(/\D/g, '').length >= 10),
  event_type: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(120),
  event_location: z.string().trim().min(1).max(300),
  website: z.string().optional(),
});
