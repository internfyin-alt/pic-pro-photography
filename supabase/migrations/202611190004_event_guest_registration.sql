begin;

create table public.photo_guest_registrations (
  token_hash text primary key,
  event_id uuid not null references public.photo_events(id) on delete cascade,
  guest_name text not null,
  phone text not null,
  location text not null,
  relationship text not null,
  selfie_jpeg bytea not null check (octet_length(selfie_jpeg) between 1 and 1048576),
  consent_version text not null,
  consent_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index photo_guest_registrations_event_idx on public.photo_guest_registrations (event_id);
create index photo_guest_registrations_expiry_idx on public.photo_guest_registrations (expires_at);

alter table public.photo_guest_registrations enable row level security;
revoke all on public.photo_guest_registrations from public, anon, authenticated;
grant all on public.photo_guest_registrations to service_role;

alter table public.photo_guest_sessions add column registration_token_hash text
  references public.photo_guest_registrations(token_hash) on delete cascade;
create index photo_guest_sessions_registration_idx on public.photo_guest_sessions (registration_token_hash);

commit;
