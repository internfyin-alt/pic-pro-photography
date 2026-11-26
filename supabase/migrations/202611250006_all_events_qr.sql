begin;

alter table public.photo_photographers
  add column all_events_share_token text unique,
  add column all_events_sharing_enabled boolean not null default false,
  add constraint photo_photographers_all_events_share_token_format
    check (all_events_share_token ~ '^[a-f0-9]{48}$'),
  add constraint photo_photographers_all_events_sharing_requires_token
    check (not all_events_sharing_enabled or all_events_share_token is not null);

commit;
