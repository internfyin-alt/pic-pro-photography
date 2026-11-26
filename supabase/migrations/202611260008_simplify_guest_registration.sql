begin;

alter table public.photo_guest_registrations
  alter column location drop not null,
  alter column relationship drop not null;

commit;
