import Link from 'next/link';
import { ArrowDown, ArrowUp, Images, Plus, Search, Share2, X } from 'lucide-react';
import { validId, type PhotoDb } from '@/lib/event-photos/server';
import GalleryDelete from './GalleryDelete';
import { studioHref } from './StudioFrame';
import styles from './Studio.module.css';

const statuses = [
  { value: 'all', label: 'All' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
  { value: 'uploading', label: 'Uploading' },
] as const;
const sorting = [
  { value: 'title', label: 'Title' },
  { value: 'event_date', label: 'Event date' },
  { value: 'created_at', label: 'Created' },
] as const;
const pageSize = 20;
const dateFormat = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default async function GalleryTable({ db, ownerId, page, query }: {
  db: PhotoDb;
  ownerId: string;
  page: number;
  query: { status?: string; q?: string; sort?: string; order?: string };
}) {
  const status = statuses.find(option => option.value === query.status)?.value ?? 'all';
  const sort = sorting.find(option => option.value === query.sort)?.value ?? 'created_at';
  const order = query.order === 'asc' ? 'asc' : 'desc';
  const search = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : '';
  const offset = (page - 1) * pageSize;

  function href(updates: Record<string, string> = {}) {
    const params = new URLSearchParams({ view: 'events', status, q: search, sort, order, ...updates });
    const defaults = { status: 'all', q: '', sort: 'created_at', order: 'desc' };
    for (const [key, value] of Object.entries(defaults)) {
      if (params.get(key) === value) params.delete(key);
    }
    return '/photo-sharing/studio?' + params.toString();
  }

  const rows = db.from('photo_events')
    .select('id,title,event_type,event_date,created_at,deleting,pending:event_photos(id),indexed:event_photos(id),failed:event_photos(id)', { count: 'exact' })
    .eq('owner_id', ownerId)
    .in('pending.status', ['uploading', 'queued', 'processing'])
    .eq('indexed.status', 'ready')
    .eq('failed.status', 'failed')
    .limit(1, { referencedTable: 'pending' })
    .limit(1, { referencedTable: 'indexed' })
    .limit(1, { referencedTable: 'failed' });

  if (validId(search)) rows.eq('id', search);
  else if (/^[a-f0-9]{8}$/i.test(search)) rows
    .gte('id', search + '-0000-0000-0000-000000000000')
    .lte('id', search + '-ffff-ffff-ffff-ffffffffffff');
  else if (search) rows.filter('title', 'imatch', search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  if (status !== 'all') rows.eq('deleting', false);
  if (status === 'uploading') rows.not('pending', 'is', null);
  if (status === 'completed') rows.is('pending', null).not('indexed', 'is', null).is('failed', null);
  if (status === 'ready') rows.is('pending', null).or('indexed.is.null,failed.not.is.null');

  const result = await rows.order(sort, { ascending: order === 'asc', nullsFirst: false })
    .order('id').range(offset, offset + pageSize - 1);
  const events = result.data ?? [];
  const total = result.count ?? 0;
  const failed = result.error && result.status !== 416;

  function sortHeading(field: typeof sorting[number]) {
    const active = sort === field.value;
    const Icon = order === 'asc' ? ArrowUp : ArrowDown;
    return <th scope="col" aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : undefined}>
      <Link href={href({ sort: field.value, order: active && order === 'asc' ? 'desc' : 'asc' })} scroll={false}>
        {field.label}{active && <Icon size={15} aria-hidden="true" />}
      </Link>
    </th>;
  }

  return <>
    <div className={styles.galleryHeading}>
      <h1>All Galleries</h1>
      <Link className={styles.primary} href={studioHref('create')}><Plus size={18} aria-hidden="true" /> Add Event</Link>
    </div>
    <section className={styles.galleryTablePanel} aria-label="Gallery directory">
      <nav className={styles.galleryFilters} aria-label="Gallery status">
        {statuses.map(option => <Link key={option.value} href={href({ status: option.value })}
          aria-current={option.value === status ? 'page' : undefined} scroll={false}>{option.label}</Link>)}
      </nav>
      <div className={styles.galleryToolbar}>
        <form className={styles.gallerySearch} role="search" action="/photo-sharing/studio" key={search}>
          <input type="hidden" name="view" value="events" />
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="order" value={order} />
          <input name="q" type="search" defaultValue={search} maxLength={100} placeholder="Search title or ID" aria-label="Search by title or event ID" />
          {search && <Link href={href({ q: '' })} scroll={false} aria-label="Clear search" title="Clear search"><X size={17} /></Link>}
          <button type="submit" aria-label="Search galleries" title="Search galleries"><Search size={18} /></button>
        </form>
        {!failed && <p>{total.toLocaleString('en-IN')} {total === 1 ? 'gallery' : 'galleries'}</p>}
      </div>
      <div className={styles.galleryTableScroll} role="region" aria-label="Galleries table" tabIndex={0}>
        <table className={styles.galleryTable}>
          <thead><tr>
            <th scope="col">No.</th>
            {sortHeading(sorting[0])}
            <th scope="col">Event ID</th>
            {sortHeading(sorting[1])}
            <th scope="col">Status</th>
            {sortHeading(sorting[2])}
            <th scope="col">Actions</th>
          </tr></thead>
          <tbody>
            {events.map((event, index) => {
              const eventHref = '/photo-sharing/studio/' + event.id;
              const state = event.deleting ? 'deleting' : event.pending?.length ? 'uploading'
                : event.indexed?.length && !event.failed?.length ? 'completed' : 'ready';
              const label = statuses.find(option => option.value === state)?.label ?? 'Deletion pending';
              return <tr key={event.id}>
                <td>{offset + index + 1}</td>
                <th scope="row"><Link href={eventHref} prefetch={false}>{event.title}</Link><small>{event.event_type}</small></th>
                <td><span className={styles.galleryId} title={event.id}>{event.id.slice(0, 8)}</span></td>
                <td>{event.event_date ? <time dateTime={event.event_date}>{dateFormat.format(new Date(event.event_date))}</time> : '—'}</td>
                <td><Link className={styles.galleryStatus} data-state={state} href={eventHref} prefetch={false}
                  aria-label={label + ' · Open ' + event.title}>{label}</Link></td>
                <td><div className={styles.galleryRowActions}>
                  {!event.deleting && <Link href={eventHref + '?section=sharing'} prefetch={false}
                    aria-label={'Share ' + event.title} title="Sharing and QR code"><Share2 size={17} /></Link>}
                  <GalleryDelete id={event.id} title={event.title} />
                </div></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      {failed ? <p className={styles.galleryEmpty} role="alert">Your galleries are temporarily unavailable.</p> : !events.length && (
        <div className={styles.galleryEmpty}>
          <Images size={28} aria-hidden="true" />
          <h2>{page > 1 ? 'No galleries on this page' : search || status !== 'all' ? 'No matching galleries' : 'No galleries yet'}</h2>
          {!search && status === 'all' && page === 1 && <p>Create an event to get started.</p>}
        </div>
      )}
      {(page > 1 || total > offset + pageSize) && <nav aria-label="Gallery pages" className={styles.galleryPagination}>
        {page > 1 && <Link className={styles.secondary} href={href({ page: String(page - 1) })}>Previous</Link>}
        <span>Page {page.toLocaleString('en-IN')}</span>
        {total > offset + pageSize && <Link className={styles.secondary} href={href({ page: String(page + 1) })}>Next</Link>}
      </nav>}
    </section>
  </>;
}
