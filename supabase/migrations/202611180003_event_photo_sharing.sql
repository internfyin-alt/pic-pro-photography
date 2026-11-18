-- Server-only event sharing data. The API checks ownership before using the service role.
begin;

create table public.photo_photographers (
  id uuid primary key references auth.users(id) on delete restrict,
  name text not null,
  email text not null,
  suspended boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.photo_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.photo_photographers(id) on delete restrict,
  title text not null,
  event_type text not null,
  event_date date,
  share_token text not null unique,
  sharing_enabled boolean not null default false,
  deleting boolean not null default false,
  permission_confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index photo_events_owner_idx on public.photo_events (owner_id, created_at desc);

create table public.event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.photo_events(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  byte_size integer not null check (byte_size > 0 and byte_size <= 26214400),
  status text not null default 'uploading' check (status in ('uploading','queued','processing','ready','failed','deleting','abandoned')),
  face_count integer not null default 0,
  index_attempted boolean not null default false,
  error text,
  lease_until timestamptz,
  job_token uuid,
  created_at timestamptz not null default now()
);
create index event_photos_event_idx on public.event_photos (event_id, created_at desc);
create index event_photos_jobs_idx on public.event_photos (created_at) where status in ('queued', 'processing');

create table public.photo_storage_cleanup (
  storage_path text primary key,
  remove_after timestamptz not null
);

create table public.photo_platform_settings (
  singleton boolean primary key default true check (singleton),
  guest_access boolean not null default true
);
insert into public.photo_platform_settings default values;

create table public.photo_guest_sessions (
  token_hash text primary key,
  event_id uuid not null references public.photo_events(id) on delete cascade,
  consent_version text not null,
  consent_at timestamptz not null default now(),
  expires_at timestamptz not null,
  photo_ids uuid[] not null
);
create index photo_guest_sessions_expiry_idx on public.photo_guest_sessions (expires_at);

create table public.photo_audit (
  id bigint generated always as identity primary key,
  event_id uuid references public.photo_events(id) on delete set null,
  actor_id uuid,
  subject_id uuid,
  action text not null,
  result_count integer,
  created_at timestamptz not null default now()
);
create index photo_audit_event_idx on public.photo_audit (event_id, created_at desc);

create table public.photo_rate_limits (
  scope text not null,
  bucket bigint not null,
  attempts integer not null default 1,
  primary key (scope, bucket)
);

alter table public.photo_photographers enable row level security;
alter table public.photo_events enable row level security;
alter table public.event_photos enable row level security;
alter table public.photo_guest_sessions enable row level security;
alter table public.photo_audit enable row level security;
alter table public.photo_rate_limits enable row level security;
alter table public.photo_storage_cleanup enable row level security;
alter table public.photo_platform_settings enable row level security;

revoke all on public.photo_photographers, public.photo_events, public.event_photos,
  public.photo_guest_sessions, public.photo_audit, public.photo_rate_limits, public.photo_storage_cleanup,
  public.photo_platform_settings from anon, authenticated;
grant all on public.photo_photographers, public.photo_events, public.event_photos,
  public.photo_guest_sessions, public.photo_audit, public.photo_rate_limits, public.photo_storage_cleanup,
  public.photo_platform_settings to service_role;
grant usage, select on sequence public.photo_audit_id_seq to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-photo-originals', 'event-photo-originals', false, 26214400, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- The existing admin storage policy predates event sharing. Exclude the originals
-- bucket so admins and photographers reach it through the same audited API.
drop policy media_admin_write on storage.objects;
create policy media_admin_write on storage.objects for all to authenticated
  using (bucket_id <> 'event-photo-originals' and public.is_admin())
  with check (bucket_id <> 'event-photo-originals' and public.is_admin());

create function public.reserve_event_photo(p_id uuid, p_event uuid, p_path text, p_name text, p_bytes integer)
returns boolean language plpgsql set search_path = '' as $$
begin
  perform id from public.photo_events where id = p_event and not deleting for update;
  if not found then return false; end if;
  if (select count(*) from public.event_photos where event_id = p_event) >= 5000 then return false; end if;
  insert into public.event_photos (id, event_id, storage_path, file_name, byte_size)
    values (p_id, p_event, p_path, p_name, p_bytes);
  return true;
end;
$$;

create function public.queue_removed_photo_cleanup()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.created_at + interval '2 hours 30 minutes' > now() then
    insert into public.photo_storage_cleanup (storage_path, remove_after)
    values (old.storage_path, old.created_at + interval '2 hours 30 minutes')
    on conflict (storage_path) do nothing;
  end if;
  return old;
end;
$$;

create trigger event_photo_cleanup after delete on public.event_photos
for each row execute function public.queue_removed_photo_cleanup();

create function public.consume_photo_limit(p_scope text, p_bucket bigint, p_limit integer)
returns boolean language sql set search_path = '' as $$
  insert into public.photo_rate_limits (scope, bucket)
  values (p_scope, p_bucket)
  on conflict (scope, bucket) do update set attempts = public.photo_rate_limits.attempts + 1
  returning attempts <= p_limit
$$;

create function public.claim_event_photo(p_event uuid default null)
returns setof public.event_photos language sql set search_path = '' as $$
  with next_job as (
    select p.id
    from public.event_photos p
    join public.photo_events e on e.id = p.event_id
    join public.photo_photographers owner on owner.id = e.owner_id
    where (p_event is null or p.event_id = p_event)
      and not e.deleting and not owner.suspended
      and (p.status = 'queued' or (p.status = 'processing' and p.lease_until < now()))
    order by p.created_at
    for update of p, e skip locked
    limit 1
  )
  update public.event_photos p
  set status = 'processing', lease_until = now() + interval '10 minutes', job_token = gen_random_uuid(), index_attempted = true, error = null
  from next_job
  where p.id = next_job.id
  returning p.*
$$;

create function public.photo_platform_usage()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'bytes', coalesce(sum(byte_size) filter (where status <> 'uploading'), 0),
    'faces', coalesce(sum(face_count) filter (where status = 'ready'), 0),
    'indexed', count(*) filter (where status = 'ready'),
    'failed', count(*) filter (where status = 'failed'),
    'guest_searches', (select count(*) from public.photo_audit where action = 'guest.search')
  ) from public.event_photos
$$;

revoke all on function public.consume_photo_limit(text,bigint,integer) from public, anon, authenticated;
revoke all on function public.claim_event_photo(uuid) from public, anon, authenticated;
revoke all on function public.photo_platform_usage() from public, anon, authenticated;
revoke all on function public.reserve_event_photo(uuid,uuid,text,text,integer) from public, anon, authenticated;
revoke all on function public.queue_removed_photo_cleanup() from public, anon, authenticated;
grant execute on function public.consume_photo_limit(text,bigint,integer) to service_role;
grant execute on function public.claim_event_photo(uuid) to service_role;
grant execute on function public.photo_platform_usage() to service_role;
grant execute on function public.reserve_event_photo(uuid,uuid,text,text,integer) to service_role;

commit;
