-- PIC PRO database baseline. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,full_name text,email text,phone text,role text not null default 'client' check(role in ('admin','client')),created_at timestamptz default now(),updated_at timestamptz default now());
create table public.services(id uuid primary key default gen_random_uuid(),title text not null,slug text unique not null,short_description text,description text,cover_image text,features jsonb default '[]',seo_title text,seo_description text,is_published boolean default false,created_at timestamptz default now());
create table public.portfolio_categories(id uuid primary key default gen_random_uuid(),name text not null,slug text unique not null);
create table public.portfolio_albums(id uuid primary key default gen_random_uuid(),title text not null,slug text unique not null,category_id uuid references public.portfolio_categories(id),description text,cover_image text,is_featured boolean default false,is_published boolean default false,created_at timestamptz default now());
create table public.portfolio_images(id uuid primary key default gen_random_uuid(),album_id uuid not null references public.portfolio_albums(id) on delete cascade,storage_path text not null,alt_text text,sort_order int default 0,created_at timestamptz default now());
create table public.packages(id uuid primary key default gen_random_uuid(),name text not null,slug text unique not null,description text,price numeric(12,2),currency text default 'INR',features jsonb default '[]',is_featured boolean default false,is_active boolean default false,created_at timestamptz default now());
create table public.bookings(id uuid primary key default gen_random_uuid(),booking_reference text unique not null,client_id uuid references public.profiles(id),full_name text not null,email text not null,phone text not null,whatsapp text,event_type text not null,event_date date not null,event_location text,city text,estimated_budget text,package_id uuid references public.packages(id),requirements text,message text,status text not null default 'new' check(status in ('new','contacted','quoted','confirmed','in_progress','completed','cancelled')),created_at timestamptz default now(),updated_at timestamptz default now());
create table public.testimonials(id uuid primary key default gen_random_uuid(),client_name text not null,event_type text,rating int check(rating between 1 and 5),review text,image_path text,is_approved boolean default false,created_at timestamptz default now());
create table public.videos(id uuid primary key default gen_random_uuid(),title text not null,description text,category text,video_url text,thumbnail_path text,is_featured boolean default false,is_published boolean default false,created_at timestamptz default now());
create table public.blog_posts(id uuid primary key default gen_random_uuid(),title text not null,slug text unique not null,excerpt text,content text,cover_image text,seo_title text,seo_description text,is_published boolean default false,published_at timestamptz,created_at timestamptz default now());
create table public.enquiries(id uuid primary key default gen_random_uuid(),name text not null,email text not null,phone text,message text,service text,status text default 'new' check(status in ('new','contacted','closed')),created_at timestamptz default now());
create table public.client_galleries(id uuid primary key default gen_random_uuid(),client_id uuid not null references public.profiles(id),booking_id uuid references public.bookings(id),title text not null,description text,access_type text default 'private' check(access_type in ('private')),is_published boolean default false,created_at timestamptz default now());
create table public.client_gallery_images(id uuid primary key default gen_random_uuid(),gallery_id uuid not null references public.client_galleries(id) on delete cascade,storage_path text not null,file_name text,created_at timestamptz default now());
create table public.site_settings(id uuid primary key default gen_random_uuid(),setting_key text unique not null,setting_value jsonb,updated_at timestamptz default now());
create index on public.bookings(event_date,status);create index on public.bookings(client_id);create index on public.portfolio_images(album_id,sort_order);create index on public.client_galleries(client_id);create index on public.client_gallery_images(gallery_id);
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin') $$;
revoke all on function public.is_admin() from public;grant execute on function public.is_admin() to authenticated,anon;
-- Only an administrator can create/update profiles. First admin is provisioned manually in SQL Editor.
alter table public.profiles enable row level security;
create policy profiles_select on public.profiles for select to authenticated using(id=(select auth.uid()) or public.is_admin());
create policy profiles_admin_all on public.profiles for all to authenticated using(public.is_admin()) with check(public.is_admin());
-- Public content tables
alter table public.services enable row level security;alter table public.portfolio_categories enable row level security;alter table public.portfolio_albums enable row level security;alter table public.portfolio_images enable row level security;alter table public.packages enable row level security;alter table public.testimonials enable row level security;alter table public.videos enable row level security;alter table public.blog_posts enable row level security;
create policy services_public on public.services for select to anon,authenticated using(is_published or public.is_admin());
create policy categories_public on public.portfolio_categories for select to anon,authenticated using(true);
create policy albums_public on public.portfolio_albums for select to anon,authenticated using(is_published or public.is_admin());
create policy images_public on public.portfolio_images for select to anon,authenticated using(exists(select 1 from public.portfolio_albums a where a.id=album_id and a.is_published) or public.is_admin());
create policy packages_public on public.packages for select to anon,authenticated using(is_active or public.is_admin());
create policy testimonials_public on public.testimonials for select to anon,authenticated using(is_approved or public.is_admin());
create policy videos_public on public.videos for select to anon,authenticated using(is_published or public.is_admin());
create policy blog_public on public.blog_posts for select to anon,authenticated using(is_published or public.is_admin());
create policy services_admin on public.services for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy categories_admin on public.portfolio_categories for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy albums_admin on public.portfolio_albums for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy images_admin on public.portfolio_images for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy packages_admin on public.packages for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy testimonials_admin on public.testimonials for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy videos_admin on public.videos for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy blog_admin on public.blog_posts for all to authenticated using(public.is_admin()) with check(public.is_admin());
-- Bookings and enquiries: anonymous insert only; no public select.
alter table public.bookings enable row level security;alter table public.enquiries enable row level security;
create policy bookings_insert on public.bookings for insert to anon,authenticated with check(client_id is null and status='new');
create policy bookings_select on public.bookings for select to authenticated using(public.is_admin() or client_id=(select auth.uid()));
create policy bookings_admin on public.bookings for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy enquiries_insert on public.enquiries for insert to anon,authenticated with check(status='new');
create policy enquiries_admin on public.enquiries for all to authenticated using(public.is_admin()) with check(public.is_admin());
-- Private client galleries and images
alter table public.client_galleries enable row level security;alter table public.client_gallery_images enable row level security;
create policy galleries_select on public.client_galleries for select to authenticated using(public.is_admin() or (client_id=(select auth.uid()) and is_published));
create policy galleries_admin on public.client_galleries for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy gallery_images_select on public.client_gallery_images for select to authenticated using(public.is_admin() or exists(select 1 from public.client_galleries g where g.id=gallery_id and g.client_id=(select auth.uid()) and g.is_published));
create policy gallery_images_admin on public.client_gallery_images for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.site_settings enable row level security;
create policy settings_admin on public.site_settings for all to authenticated using(public.is_admin()) with check(public.is_admin());
-- Storage bucket configuration
insert into storage.buckets(id,name,public) values('portfolio-images','portfolio-images',true),('service-images','service-images',true),('blog-images','blog-images',true),('video-thumbnails','video-thumbnails',true),('client-gallery-files','client-gallery-files',false),('client-deliverables','client-deliverables',false) on conflict(id) do nothing;
create policy media_public_read on storage.objects for select to anon,authenticated using(bucket_id in ('portfolio-images','service-images','blog-images','video-thumbnails'));
create policy media_admin_write on storage.objects for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy private_gallery_read on storage.objects for select to authenticated using(bucket_id='client-gallery-files' and exists(select 1 from public.client_gallery_images gi join public.client_galleries g on g.id=gi.gallery_id where gi.storage_path=name and g.client_id=(select auth.uid()) and g.is_published));
