import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import type { PhotoDb } from '@/lib/event-photos/server';
import { studioHref } from './StudioFrame';
import styles from './Studio.module.css';

const monthHeading = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dayHeading = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const localDate = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Kolkata' });
const calendar = studioHref('calendar');

export default async function EventCalendar({ db, ownerId, month }: { db: PhotoDb; ownerId: string; month?: string }) {
  const selected = typeof month === 'string' && /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(month)
    ? month : localDate.format(new Date()).slice(0, 7);
  const first = new Date(selected + '-01T00:00:00Z');
  const end = new Date(first);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  const previous = new Date(first);
  previous.setUTCMonth(previous.getUTCMonth() - 1);
  const next = new Date(first);
  next.setUTCMonth(next.getUTCMonth() + 1);

  const { data: events, error } = await db.from('photo_events').select('id,title,event_date,event_type')
    .eq('owner_id', ownerId).eq('deleting', false).gte('event_date', selected + '-01')
    .lte('event_date', end.toISOString().slice(0, 10)).order('event_date').order('id');

  return <section className={styles.panel} aria-labelledby="calendar-month">
    <div className={styles.panelHeading}>
      <div className={styles.headingWithIcon}>
        <span className={styles.iconBox}><CalendarDays size={21} aria-hidden="true" /></span>
        <h2 id="calendar-month">{monthHeading.format(first)}</h2>
      </div>
      <div className={styles.actions}>
        {selected !== '0001-01' && <Link className={styles.secondary} href={calendar + '&month=' + previous.toISOString().slice(0, 7)} prefetch={false}>Previous month</Link>}
        {selected !== '9999-12' && <Link className={styles.secondary} href={calendar + '&month=' + next.toISOString().slice(0, 7)} prefetch={false}>Next month</Link>}
      </div>
    </div>
    {error ? <p className={styles.metricNote} role="status">The calendar is temporarily unavailable.</p>
      : !events?.length ? <p className={styles.metricNote}>No galleries are scheduled for this month.</p>
      : <ul className={styles.eventList}>
        {events.map(event => <li className={styles.calendarRow} key={event.id}>
          <time dateTime={event.event_date}>{dayHeading.format(new Date(event.event_date))}</time>
          <div><h3><Link className={styles.textLink} href={'/photo-sharing/studio/' + event.id} prefetch={false}>{event.title}</Link></h3>
            <p>{event.event_type}</p></div>
        </li>)}
      </ul>}
  </section>;
}
