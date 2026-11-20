begin;

alter table public.photo_photographers
  add column deleted_at timestamptz,
  add constraint photo_photographers_deleted_suspended
    check (deleted_at is null or suspended);

commit;
