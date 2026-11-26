import Link from 'next/link';
import {
  Aperture, BookOpen, CalendarDays, CalendarPlus, ChartNoAxesColumn, ChevronDown, CircleHelp,
  House, Images, LogOut, MessageCircle, QrCode, Settings, type LucideIcon,
} from 'lucide-react';
import SiteLogo from '@/components/SiteLogo';
import { photographerLogout } from '../actions';
import { StudioThemeControl } from './StudioTheme';
import styles from './Studio.module.css';

const studio = '/photo-sharing/studio';
export type StudioView = 'home' | 'calendar' | 'events' | 'create' | 'photos' | 'album' | 'qr' | 'whatsapp' | 'analytics' | 'profile';

export function studioHref(view: StudioView) {
  return view === 'home' ? studio : studio + '?view=' + view;
}

const navigation: { heading: string; items: { view: StudioView; label: string; icon: LucideIcon }[] }[] = [
  { heading: 'Workspace', items: [
    { view: 'home', label: 'Dashboard', icon: House },
    { view: 'calendar', label: 'Calendar', icon: CalendarDays },
    { view: 'analytics', label: 'Analytics', icon: ChartNoAxesColumn },
  ] },
  { heading: 'Galleries', items: [
    { view: 'create', label: 'Create New Gallery', icon: CalendarPlus },
    { view: 'events', label: 'All Galleries', icon: Images },
    { view: 'photos', label: 'Photo review', icon: Aperture },
    { view: 'album', label: 'eAlbum Flipbook', icon: BookOpen },
  ] },
  { heading: 'Guest sharing', items: [
    { view: 'qr', label: 'All in One QR', icon: QrCode },
    { view: 'whatsapp', label: 'WhatsApp sharing', icon: MessageCircle },
  ] },
];

export default function StudioFrame({ active, name, canManage, eventWorkspace, children }: {
  active: StudioView;
  name?: string;
  canManage?: boolean;
  eventWorkspace?: boolean;
  children: React.ReactNode;
}) {
  const current = navigation.flatMap(group => group.items).find(item => item.view === active)?.label ?? 'Studio profile';
  const initials = name?.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join('').toUpperCase();

  function navLinks() {
    return navigation.map(({ heading, items }) => (
      <div key={heading} className={styles.navGroup}>
        <p>{heading}</p>
        {items.map(({ view, label, icon: Icon }) => (
          <Link key={view} href={studioHref(view)} prefetch={false} aria-current={active === view ? 'page' : undefined}>
            <Icon size={19} aria-hidden="true" />{label}
          </Link>
        ))}
      </div>
    ));
  }

  return <div className={styles.frame + (eventWorkspace ? ' ' + styles.focusFrame : '')}>
    {!eventWorkspace && <div className={styles.sidebar}>
      <Link className={styles.brand} href={studio} aria-label="PIC PRO studio overview">
        <SiteLogo alt="PIC PRO" width={72} eager />
        <span>Photographer<br />Studio</span>
      </Link>
      {canManage && <nav aria-label="Studio navigation" className={styles.navigation}>{navLinks()}</nav>}
      <div className={styles.sidebarFoot}>
        <Link href="/photo-sharing/how-it-works"><CircleHelp size={19} aria-hidden="true" />Sharing guide</Link>
      </div>
    </div>}
    <div className={styles.content}>
      <header className={styles.topbar}>
        <span className={styles.location}>{active === 'events' ? 'Photographer Studio' : current}</span>
        {canManage ? <details className={styles.mobileMenu} key={active}>
          <summary aria-label="Studio menu"><SiteLogo alt="PIC PRO" width={72} eager /> <ChevronDown size={17} aria-hidden="true" /></summary>
          <nav aria-label="Studio navigation" className={styles.navigation}>{navLinks()}</nav>
        </details> : <span className={styles.mobileBrand}>
          <SiteLogo alt="PIC PRO" width={72} eager />Photographer Studio
        </span>}
        <div className={styles.topActions}>
          <StudioThemeControl />
          {canManage && active !== 'create' && active !== 'events' && <Link aria-label="Create New Gallery" className={styles.topCreate} href={studioHref('create')}>
            <CalendarPlus size={18} aria-hidden="true" /> <span>Create New Gallery</span>
          </Link>}
          {name && <details className={styles.account} key={active}>
            <summary aria-label="Studio account">
              <span className={styles.avatar} aria-hidden="true">{initials || 'P'}</span>
              <span className={styles.accountName}>{name}</span>
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <div className={styles.accountMenu}>
              {canManage && <Link href={studioHref('profile')} aria-current={active === 'profile' ? 'page' : undefined}>
                <Settings size={17} aria-hidden="true" /> Studio profile
              </Link>}
              <form action={photographerLogout}>
                <button type="submit"><LogOut size={17} aria-hidden="true" /> Sign out</button>
              </form>
            </div>
          </details>}
        </div>
      </header>
      {children}
      <footer className={styles.footer}><span>PIC PRO Photography & Videography</span>
        <Link href="/photo-sharing/how-it-works">Sharing guide</Link>
      </footer>
    </div>
  </div>;
}
