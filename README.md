# PIC PRO Photography & Videography

Premium Next.js photography studio starter, with original PIC PRO logo, public website, booking enquiry API, Supabase schema, RLS, admin read-only tables and booking status management, client login and signed private-gallery image links.

## Run on Windows (PowerShell)
1. Extract `PIC_PRO_Website.zip` to Desktop (or another folder).
2. Open the extracted `pic-pro-website` folder in VS Code.
3. Open **Terminal > New Terminal** and run:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

4. Open **http://localhost:3000**.

The **public design works without Supabase**, but booking/contact submissions and login will return a configuration error until Supabase is connected.

## Supabase setup
1. Create a free Supabase project at supabase.com.
2. Open **SQL Editor** and run the migrations in order. Run `supabase/migrations/202611180001_initial.sql` for a new project, then run `supabase/migrations/202611180002_event_request_fields.sql`. If the initial migration is already applied, run the second migration only.
3. From **Project Settings > API**, copy Project URL and publishable/anon key into `.env.local`:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_KEY
```

4. Restart `npm run dev` after changing env variables.
5. Create your own admin user from Supabase **Authentication > Users > Add user**. Copy that user's UUID. In SQL Editor run (replace both placeholders):

```sql
insert into public.profiles(id,email,role,full_name)
values ('YOUR_AUTH_USER_UUID','YOUR_REAL_EMAIL','admin','PIC PRO Admin')
on conflict(id) do update set role='admin';
```

6. Sign in at `/admin/login` using that user's password. Never put an admin password in code.
7. For clients, create an Auth user, insert a matching `profiles` record with `role='client'`, and assign published `client_galleries` to their UUID.

## Admin and CMS
The dashboard displays database counts and records; booking and enquiry statuses can be changed from the dashboard. **Creating/editing services, galleries, packages, videos, blog posts, site settings, and uploading assets currently requires Supabase Studio**. The homepage currently uses labeled demo photography from Unsplash and static text. It is not yet driven by admin settings. Replace demo imagery before launch.

## Security and deployment notes
- RLS is enabled on all app tables; private gallery storage is not public.
- Client gallery links are short-lived signed URLs.
- The public booking route uses validation and a honeypot but **does not yet implement distributed rate limiting, CAPTCHA, email notifications, or idempotency**. Add those before accepting production traffic.
- Public portfolio buckets have read access; private gallery bucket requires ownership.
- Set `NEXT_PUBLIC_SITE_URL` to your deployed HTTPS domain on Vercel.
- Add Resend credentials and verified sender domain before implementing email notifications.
- Add your real WhatsApp number in settings before adding WhatsApp links.
- Verify legal policy wording and replace all placeholder/demo content.
- No client ZIP download, advanced media upload UI, full CMS CRUD, or real video playback is included in this starter.

## Build checks
```powershell
npm run typecheck
npm run build
```

## Routes
Public: `/`, `/about`, `/services`, `/services/[slug]`, `/portfolio`, `/gallery`, `/videos`, `/packages`, `/booking`, `/contact`, `/faq`, `/blog`, `/testimonials`, `/privacy-policy`, `/terms-and-conditions`, plus service redirects.
Admin: `/admin/login`, `/admin`, `/admin/bookings`, `/admin/enquiries`, `/admin/services`, `/admin/portfolio`, `/admin/gallery`, `/admin/videos`, `/admin/packages`, `/admin/testimonials`, `/admin/blog`, `/admin/clients`, `/admin/client-galleries`, `/admin/settings`.
Client: `/client/login`, `/client/dashboard`, `/client/bookings`, `/client/gallery/[id]`, `/client/profile`.

## Tables
profiles, services, portfolio_categories, portfolio_albums, portfolio_images, packages, bookings, testimonials, videos, blog_posts, enquiries, client_galleries, client_gallery_images, site_settings.

## Important
This is a **substantial runnable starter, not a finished production-ready implementation of all 25 requested sections**. Credentials are not bundled. Package installation/build verification requires network access and must be performed locally if npm registry is inaccessible in this environment.
