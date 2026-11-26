import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Aperture, CalendarDays, CalendarPlus, ChartNoAxesColumn, Download, ScanFace,
  Images, MessageCircle, Users,
} from 'lucide-react';
import CreateEvent from '@/components/event-photos/CreateEvent';
import PublicPhoto from '@/components/PublicPhoto';
import { photoActor, PhotoError, type PhotoDb, type PhotoEvent } from '@/lib/event-photos/server';
import { guestShareUrl, whatsappShareUrl } from '@/lib/event-photos/share-url';
import { images } from '@/lib/photos';
import { createPhotographer, updatePhotographer } from '../actions';
import AllEventsQr from './AllEventsQr';
import EventCalendar from './EventCalendar';
import GalleryTable from './GalleryTable';
import StudioFrame, { studioHref, type StudioView } from './StudioFrame';
import styles from './Studio.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Photographer Studio', robots: { index: false }, referrer: 'no-referrer' };

type Event = Pick<PhotoEvent, 'id' | 'title' | 'event_type' | 'event_date' | 'sharing_enabled' | 'deleting' | 'share_token'>;
type Query = { view?: string; status?: string; days?: string; page?: string; month?: string; q?: string; sort?: string; order?: string };
type Directory = 'photos' | 'album' | 'qr' | 'whatsapp';
const pageSize = 20;
const views: StudioView[] = ['home', 'calendar', 'events', 'create', 'photos', 'album', 'qr', 'whatsapp', 'analytics', 'profile'];
const dateFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' });

const directories = {
  events: { title: 'All Galleries', description: 'Open an event to manage its photos, gallery access and settings.', action: 'Manage event', anchor: '' },
  photos: { title: 'Photo review', description: 'Choose an event to preview uploads and check face indexing results.', action: 'Review photos', anchor: '' },
  album: { title: 'eAlbum Flipbook', description: 'Choose a gallery to browse its indexed photos one page at a time.', action: 'Open flipbook', anchor: '?view=album' },
  qr: { title: 'Event QR codes', description: 'Open an event to download, replace or print its guest QR code.', action: 'Open QR settings', anchor: '?section=sharing' },
  whatsapp: { title: 'WhatsApp sharing', description: 'Send an enabled guest gallery link in a WhatsApp conversation.', action: 'Manage sharing', anchor: '?section=sharing' },
};

async function EventList({ db, ownerId, view, page = 1 }: { db: PhotoDb; ownerId: string; view: Directory | 'home'; page?: number }) {
  const size = view === 'home' ? 4 : pageSize;
  const offset = (page - 1) * size;
  const query = db.from('photo_events').select('id,title,event_type,event_date,sharing_enabled,deleting,share_token', { count: 'exact' })
    .eq('owner_id', ownerId).order('created_at', { ascending: false }).order('id').range(offset, offset + size - 1);
  const result = await query;
  if (result.error && result.status !== 416) return <div className={styles.panel}><p role="status">Your events are temporarily unavailable.</p></div>;
  const events: Event[] = result.data ?? [];
  const total = result.count ?? 0;
  const config = directories[view === 'home' ? 'events' : view];

  return <section className={styles.panel} aria-label={view === 'home' ? 'Recent events' : config.title}>
    {view === 'home' && <div className={styles.panelHeading}>
      <h2>Recent events</h2><Link className={styles.textLink} href={studioHref('events')}>View all events</Link>
    </div>}
    {view === 'qr' && <div className={styles.panelHeading}>
      <div><h2>{config.title}</h2><p>{config.description}</p></div>
    </div>}
    {!events.length && <div className={styles.empty}>
      <CalendarDays size={25} aria-hidden="true" />
      <h3>{page > 1 ? 'No events on this page' : 'No events yet'}</h3>
      {page === 1 && <><p>Create an event to upload photos and set up guest sharing.</p>
        <Link className={styles.primary} href={studioHref('create')}>Create an event</Link></>}
    </div>}
    {!!events.length && <ul className={styles.eventList}>
      {events.map(event => {
        const eventHref = '/photo-sharing/studio/' + event.id + config.anchor;
        const url = view === 'whatsapp' && event.sharing_enabled && !event.deleting ? guestShareUrl(event.share_token) : null;
        return <li key={event.id} className={styles.eventRow}>
          <span className={styles.iconBox}><CalendarDays size={19} aria-hidden="true" /></span>
          <div className={styles.eventInfo}><h3>{event.title}</h3>
            <p>{event.event_type}{event.event_date && <> · <time dateTime={event.event_date}>{dateFormat.format(new Date(event.event_date))}</time></>}</p>
          </div>
          <span className={styles.badge} data-live={event.sharing_enabled && !event.deleting}>
            {event.deleting ? 'Deletion pending' : event.sharing_enabled ? 'Sharing on' : 'Private'}
          </span>
          {url ? <a className={styles.secondary} href={whatsappShareUrl(url, event.title)} target="_blank" rel="noreferrer"
            aria-label={'Share ' + event.title + ' on WhatsApp'}><MessageCircle size={17} aria-hidden="true" /> Open WhatsApp</a>
            : <Link className={styles.secondary} href={eventHref} prefetch={false}
              aria-label={config.action + ' for ' + event.title}>{config.action}</Link>}
        </li>;
      })}
    </ul>}
    {view !== 'home' && (page > 1 || total > offset + size) && <nav aria-label="Event pages" className={styles.pagination}>
      {page > 1 && <Link className={styles.secondary} href={studioHref(view) + '&page=' + (page - 1)}>Previous</Link>}
      <span>Page {page.toLocaleString()}</span>
      {total > offset + size && <Link className={styles.secondary} href={studioHref(view) + '&page=' + (page + 1)}>Next</Link>}
    </nav>}
  </section>;
}

async function GalleryAnalytics({ db, ownerId, days, view }: { db: PhotoDb; ownerId: string; days: number; view: 'home' | 'analytics' }) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const searchActivity = () => db.from('photo_audit')
    .select('id,photo_events!inner(owner_id)', { count: 'exact', head: true })
    .eq('photo_events.owner_id', ownerId).gte('created_at', since).eq('action', 'guest.search');
  const results = await Promise.all([
    db.from('photo_guest_registrations').select('token_hash,photo_events!inner(owner_id)', { count: 'exact', head: true })
      .eq('photo_events.owner_id', ownerId).gte('consent_at', since).gt('expires_at', new Date().toISOString()),
    searchActivity(),
    searchActivity().gt('result_count', 0),
    db.from('photo_audit').select('id,photo_events!inner(owner_id)', { count: 'exact', head: true })
      .eq('photo_events.owner_id', ownerId).gte('created_at', since).eq('action', 'guest.download_requested'),
  ]);
  const metrics = [
    { label: 'Active registrations', icon: Users },
    { label: 'Guest searches', icon: ScanFace },
    { label: 'Searches with matches', icon: Images },
    { label: 'Download requests', icon: Download },
  ];

  return <section className={styles.panel} aria-labelledby="gallery-delivery">
    <div className={styles.panelHeading}>
      <div className={styles.headingWithIcon}><span className={styles.iconBox}><ChartNoAxesColumn size={22} aria-hidden="true" /></span>
        <div><h2 id="gallery-delivery">Gallery delivery</h2><p>Guest activity over the last {days} days</p></div>
      </div>
      <nav aria-label="Analytics period" className={styles.period}>
        {[7, 30, 90].map(range => <Link key={range} prefetch={false} scroll={false} aria-current={range === days ? 'true' : undefined}
          href={studioHref(view) + (view === 'home' ? '?' : '&') + 'days=' + range + '#gallery-delivery'}>{range}d</Link>)}
      </nav>
    </div>
    <dl className={styles.metrics}>{metrics.map(({ label, icon: Icon }, index) => <div className={styles.metric} key={label}>
      <dt><Icon size={17} aria-hidden="true" />{label}</dt>
      <dd>{results[index].error ? <span className={styles.unavailable}>Unavailable</span> : (results[index].count ?? 0).toLocaleString('en-IN')}</dd>
    </div>)}</dl>
    {view === 'analytics' && <p className={styles.metricNote}>Registrations count unexpired records. A request to download several photos together counts once.</p>}
  </section>;
}

export default async function Studio({ searchParams }: { searchParams: Promise<Query> }) {
  const result = await photoActor().catch((error: unknown) => {
    if (error instanceof PhotoError && error.status === 401) redirect('/photo-sharing/login');
    return error instanceof PhotoError ? error : new PhotoError('Photographer Studio is unavailable.');
  });
  if (result instanceof PhotoError) return <StudioFrame active="home"><main className={styles.main}>
    <div className={styles.panel + ' ' + styles.formPanel}>
      <h1>Photographer studio</h1><p role="alert">{result.message}</p>
      <Link className={styles.secondary} href="/photo-sharing/login">Back to sign in</Link>
    </div>
  </main></StudioFrame>;

  const { db, owner, user } = result;
  const query = await searchParams;
  const { status } = query;
  const view = views.find(value => value === query.view) ?? 'home';
  const days = query.days === '7' ? 7 : query.days === '90' ? 90 : 30;
  const requestedPage = Number(query.page);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 && requestedPage < 1_000_000 ? requestedPage : 1;
  const displayName = owner?.name || (typeof user.user_metadata?.photographer_name === 'string' ? user.user_metadata.photographer_name : '');
  const profileName = displayName || user.email || 'Photographer';

  return <StudioFrame active={owner ? view : 'home'} name={profileName} canManage={!!owner}>
    <main className={view === 'events' && owner ? styles.galleryMain : styles.main}>
      {!owner ? <form className={styles.panel + ' ' + styles.formPanel} action={createPhotographer}>
        <h1>Set up your studio</h1>
        <label className={styles.fieldLabel}>Display name<input className="field" name="name" defaultValue={displayName} minLength={2} maxLength={100} required /></label>
        {status && <p role="status">Could not save your studio. Check the display name and try again.</p>}
        <button type="submit" className={styles.primary}>Save studio</button>
      </form> : view === 'home' ? <>
        <section className={styles.welcome}>
          <div className={styles.welcomeCopy}>
            <p className={styles.kicker}><Aperture size={17} aria-hidden="true" /> Gallery workspace</p>
            <h1>Welcome, <span>{displayName}</span></h1>
            <p>Manage your events and deliver galleries your guests can find with a selfie.</p>
            <div className={styles.actions}>
              <Link className={styles.primary} href={studioHref('create')}><CalendarPlus size={18} aria-hidden="true" /> Create New Gallery</Link>
              <Link className={styles.secondary} href={studioHref('events')}>All Galleries</Link>
            </div>
          </div>
          <PublicPhoto photo={images.wedding} alt="" className={styles.welcomeImage} sizes="(max-width: 640px) 1px, (max-width: 1100px) 55vw, 630px" priority />
        </section>
        <div className={styles.sectionHeading}><span>Analytics at a glance</span>
          <Link className={styles.textLink} href={studioHref('analytics') + '&days=' + days}>View analytics</Link>
        </div>
        <GalleryAnalytics db={db} ownerId={user.id} days={days} view={view} />
        <EventList db={db} ownerId={user.id} view={view} />
      </> : view === 'events' ? <GalleryTable db={db} ownerId={user.id} page={page} query={query} /> : view === 'calendar' ? <>
        <div className={styles.pageHeading}><h1>Calendar</h1><p>See your scheduled galleries by event date.</p></div>
        <EventCalendar db={db} ownerId={user.id} month={query.month} />
      </> : view === 'create' ? <>
        <div className={styles.createPage}>
          <div className={styles.pageHeading}><h1>Create New Gallery</h1><p>Set up a gallery for your next shoot.</p></div>
          <section className={styles.panel} aria-label="Create event form"><CreateEvent /></section>
        </div>
      </> : view === 'profile' ? <>
        <div className={styles.pageHeading}><h1>Studio profile</h1><p>Manage your photographer account.</p></div>
        <form action={updatePhotographer} className={styles.panel + ' ' + styles.formPanel}>
          <p>{user.email}</p>
          <label className={styles.fieldLabel}>Display name<input className="field" name="name" defaultValue={displayName} minLength={2} maxLength={100} required /></label>
          {status && <p role="status">{status === 'saved' ? 'Profile saved.' : 'Unable to save the profile.'}</p>}
          <div className={styles.actions}><button type="submit" className={styles.primary}>Save profile</button>
            <Link className={styles.secondary} href="/photo-sharing/reset?mode=change">Change password</Link></div>
        </form>
      </> : view === 'analytics' ? <>
        <div className={styles.pageHeading}><h1>Analytics</h1><p>See how guests use your event galleries.</p></div>
        <GalleryAnalytics db={db} ownerId={user.id} days={days} view={view} />
      </> : view === 'qr' ? <>
        <div className={styles.pageHeading}><h1>All in One QR</h1></div>
        <AllEventsQr db={db} ownerId={user.id} status={status} />
        <EventList db={db} ownerId={user.id} view={view} page={page} />
      </> : <>
        <div className={styles.pageHeading}><h1>{directories[view].title}</h1><p>{directories[view].description}</p></div>
        <EventList db={db} ownerId={user.id} view={view} page={page} />
      </>}
    </main>
  </StudioFrame>;
}
