import { z } from 'zod';
import { eventTypes } from './constants';

export const eventDetails = z.object({
  title: z.string().trim().min(2).max(100),
  eventType: z.string().refine(value => eventTypes.includes(value)),
  eventDate: z.union([z.literal(''), z.string().date()]),
});

export const gallerySettings = z.object({
  guestDownloadsEnabled: z.boolean().optional(),
  faceSearchEnabled: z.boolean().optional(),
  guestPhoneRequired: z.boolean().optional(),
});

export function gallerySettingsFields(settings: z.infer<typeof gallerySettings>) {
  return {
    guest_downloads_enabled: settings.guestDownloadsEnabled,
    face_search_enabled: settings.faceSearchEnabled,
    guest_phone_required: settings.guestPhoneRequired,
  };
}
