alter table public.bookings
  alter column email drop not null,
  alter column event_date drop not null;

alter table public.enquiries
  alter column email drop not null,
  add column event_type text,
  add column city text,
  add column event_location text;
