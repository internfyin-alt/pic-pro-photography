begin;

alter table public.photo_events
  add column guest_downloads_enabled boolean not null default true,
  add column face_search_enabled boolean not null default true,
  add column guest_phone_required boolean not null default true,
  add constraint photo_events_sharing_requires_face_search
    check (not sharing_enabled or face_search_enabled);

alter table public.photo_guest_registrations alter column phone drop not null;

commit;
