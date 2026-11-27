begin;

alter table public.photo_guest_registrations
  add column whatsapp_opted_in_at timestamptz,
  add column whatsapp_next_attempt_at timestamptz,
  add column whatsapp_claim_id uuid,
  add column whatsapp_claim_until timestamptz,
  add column whatsapp_sent_at timestamptz;

create index photo_guest_whatsapp_pending_idx
  on public.photo_guest_registrations (event_id, whatsapp_next_attempt_at)
  where whatsapp_opted_in_at is not null and whatsapp_sent_at is null;

create function public.queue_guest_whatsapp_matches()
returns trigger language plpgsql set search_path = '' as $$
begin
  update public.photo_guest_registrations
    set whatsapp_next_attempt_at = now()
    where event_id = new.event_id and expires_at > now()
      and whatsapp_opted_in_at is not null and whatsapp_sent_at is null
      and whatsapp_next_attempt_at is null;
  return new;
end;
$$;

create trigger queue_guest_whatsapp_matches
after update of status on public.event_photos
for each row when (old.status <> 'ready' and new.status = 'ready' and new.face_count > 0)
execute function public.queue_guest_whatsapp_matches();

create function public.claim_guest_whatsapp_notification(p_event uuid default null)
returns table (token_hash text, event_id uuid, phone text, selfie_jpeg bytea, claim_id uuid, share_token text)
language sql set search_path = '' as $$
  with candidate as (
    select r.token_hash, e.share_token
    from public.photo_guest_registrations r
    join public.photo_events e on e.id = r.event_id
    join public.photo_photographers owner on owner.id = e.owner_id
    where (p_event is null or r.event_id = p_event)
      and r.expires_at > now() and r.whatsapp_opted_in_at is not null
      and r.phone is not null and r.whatsapp_sent_at is null
      and (r.whatsapp_claim_until is null or r.whatsapp_claim_until <= now())
      and (r.whatsapp_next_attempt_at <= now() or r.whatsapp_claim_until <= now())
      and e.sharing_enabled and e.face_search_enabled and not e.deleting
      and not owner.suspended
      and exists (select 1 from public.photo_platform_settings settings where settings.guest_access)
      and exists (
        select 1 from public.event_photos p where p.event_id = e.id and p.status = 'ready' and p.face_count > 0
      )
    order by coalesce(r.whatsapp_next_attempt_at, r.whatsapp_claim_until), r.token_hash
    limit 1 for update of r skip locked
  )
  update public.photo_guest_registrations r
    set whatsapp_claim_id = gen_random_uuid(),
        whatsapp_claim_until = now() + interval '2 minutes',
        whatsapp_next_attempt_at = null
    from candidate c
    where r.token_hash = c.token_hash
    returning r.token_hash, r.event_id, r.phone, r.selfie_jpeg, r.whatsapp_claim_id, c.share_token;
$$;

revoke all on function public.queue_guest_whatsapp_matches() from public, anon, authenticated;
revoke all on function public.claim_guest_whatsapp_notification(uuid) from public, anon, authenticated;
grant execute on function public.claim_guest_whatsapp_notification(uuid) to service_role;

commit;
