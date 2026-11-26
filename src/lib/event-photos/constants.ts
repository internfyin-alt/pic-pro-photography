export const originalBucket = 'event-photo-originals';
export const maxPhotoBytes = 25 * 1024 * 1024;
export const maxSelfieBytes = 3 * 1024 * 1024;
export const photoMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
export const eventTypes = ['Wedding', 'Engagement', 'Birthday', 'Corporate', 'College', 'Festival', 'Other'];
export const consentVersion = '2026-11-19';
export const guestRegistrationDays = 30;
export const guestSessionMinutes = 30;
export const maxGuestMatches = 100;
export const photoPageSize = 50;
export const photoReviewFilters = [
  { value: 'all', label: 'All photos' },
  { value: 'ready', label: 'Indexed' },
  { value: 'pending', label: 'Indexing pending' },
  { value: 'failed', label: 'Needs attention' },
] as const;

export type PhotoReviewFilter = (typeof photoReviewFilters)[number]['value'];
