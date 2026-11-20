'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import SiteLogo from './SiteLogo';

const links = [
  ['/', 'Home'], ['/about', 'About'], ['/services', 'Services'], ['/portfolio', 'Portfolio'],
  ['/videos', 'Films'], ['/packages', 'Packages'], ['/contact', 'Contact'], ['/photo-sharing', 'Photo Sharing'],
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [prefetch, setPrefetch] = useState<string>();

  return (
    <header className="nav">
      <div className="container navinner">
        <Link href="/" aria-label="PIC PRO home" prefetch={prefetch === '/' ? 'auto' : false}
          onMouseEnter={() => setPrefetch('/')} onFocus={() => setPrefetch('/')}>
          <SiteLogo alt="PIC PRO Photography logo" width={72} eager />
        </Link>
        <button aria-label="Toggle menu" className="mobiletoggle" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        <nav className={'navlinks ' + (open ? 'open' : '')} onClick={() => setOpen(false)}>
          {links.map(([url, label]) => (
            <Link key={url} href={url} prefetch={prefetch === url ? 'auto' : false}
              onMouseEnter={() => setPrefetch(url)} onFocus={() => setPrefetch(url)}>
              {label}
            </Link>
          ))}
          <Link className="btn" href="/booking" style={{ color: '#111', minHeight: 44, padding: '8px 18px', borderRadius: 9999 }}>Book a Shoot</Link>
        </nav>
      </div>
    </header>
  );
}
