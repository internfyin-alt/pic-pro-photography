# PIC PRO Photography & Videography

Premium Next.js photography studio starter, with original PIC PRO logo, public website, booking enquiry API, Supabase schema, RLS, admin read-only tables and booking status management, client login and signed private-gallery image links.

## Run on Windows (PowerShell)
Use Node.js 20.9 or newer.

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

## Event photo sharing

The existing site links to `/photo-sharing`, with photographer registration, a studio at `/photo-sharing/studio`, QR guest access, and administration at `/admin/photo-sharing`. The site's existing admin account can administer event sharing. Photographer accounts use Supabase Auth and enroll separately from the existing client portal.

1. Apply [the event photo sharing migration](supabase/migrations/202611180003_event_photo_sharing.sql) after the first two migrations. Then apply [guest registration](supabase/migrations/202611190004_event_guest_registration.sql), [photographer removal](supabase/migrations/202611200005_photographer_removal.sql), [all-events QR](supabase/migrations/202611250006_all_events_qr.sql), [gallery settings](supabase/migrations/202611250007_gallery_settings.sql), and [simplified guest registration](supabase/migrations/202611260008_simplify_guest_registration.sql) in order before deploying.
2. In Supabase Auth, allow email signup and disable **Confirm email** so photographers can sign in immediately after registration. Add your local and production `/photo-sharing/verify?flow=recovery` URL to **Redirect URLs** for password recovery (the URL without `flow=recovery` is only needed if email confirmation is re-enabled). Configure your production email sender and test password recovery links in the same browser used to request them.
3. Set `SUPABASE_SERVICE_ROLE_KEY` and `PICPRO_REKOGNITION_REGION` in the server environment. Configure an AWS credential provider for Rekognition. On a host without an AWS role, use `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, plus `AWS_SESSION_TOKEN` for temporary credentials. Grant `rekognition:DetectFaces` and the collection actions `CreateCollection`, `IndexFaces`, `SearchFacesByImage`, `ListFaces`, `DeleteFaces`, and `DeleteCollection` for the app's `picpro-*` collections where resource-level policies are supported. Keep the Supabase service role, AWS credentials and cron secret in server-only variables.
4. Set `NEXT_PUBLIC_SITE_URL` to your HTTPS origin so the QR and confirmation links point to the deployed site. Set a random `CRON_SECRET` in production. The photographer studio starts indexing after upload while it stays open. The configured Vercel cron calls `GET /api/photo-jobs` once daily to process queued photos and clear expired sessions and abandoned uploads. If you need more frequent background processing, adjust the schedule on a supported plan or use a scheduler that sends `Authorization: Bearer <CRON_SECRET>` with the request.
5. Create an event in the production studio, enable sharing, and print its QR. Guests can register with their full name, WhatsApp number, and selfie before any photos are uploaded. They confirm consent and save their private return link in the browser. After the event, upload authorized photos and wait for indexing. Open a saved guest link on a phone to check matches.
6. Test an unrelated selfie, downloads and registration deletion. Pause sharing and verify that new previews and downloads are denied. Replacing the event QR invalidates existing links that use that QR, including personal return links.

Guest QR codes use the public HTTPS URL from `NEXT_PUBLIC_SITE_URL` or, if that value is missing or local, Vercel's `VERCEL_PROJECT_PRODUCTION_URL`. After correcting the domain and redeploying, download a fresh QR from the same event. Previously downloaded QR images keep the link they were generated with.

Photographers can enable one reusable QR under **Studio → All in One QR → Create all-events QR**. It lists their events with guest sharing turned on, including events enabled after the QR was printed. Guests choose an event and continue to its usual selfie search. Individual event QR codes still open their own event. Pausing the all-events QR hides the directory and resuming it restores the same link.

**Create New Gallery** and **Event settings** let photographers control guest downloads and guest face search. New galleries start with guest downloads disabled and sharing paused. Existing galleries keep their previous download and face search settings until edited. Turning off guest face search pauses gallery sharing.

Original photos and smaller previews remain private in Supabase. Rekognition stores indexed face vectors in a separate collection per event. Each registration includes a resized selfie. The app stores it in a service-role-only table, uses it with Rekognition for this event and blocks access after 30 days. The existing cron job removes expired registrations. Guests can delete their registration from their personal link. Event deletion removes its registrations. Review your AWS AI-services data settings and your biometric notice and retention process before inviting real guests. Photo viewing sessions expire after 30 minutes or when the registration expires. Pausing sharing or deleting a registration blocks new photo links, and previously issued links expire within 60 seconds. Anyone with the current QR link can register. Matching checks similarity and does not verify liveness or identity. ZIP downloads support up to 200 MB per selection. Billing and subscriptions are disabled.

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
