import Link from 'next/link';
import { MapPin, Phone } from 'lucide-react';
import SiteLogo from './SiteLogo';

const exploreLinks = [
  ['/about', 'Our Studio'],
  ['/services', 'Our Services'],
  ['/portfolio', 'Portfolio'],
  ['/packages', 'Packages'],
  ['/booking', 'Book a Shoot'],
];

const informationLinks = [
  ['/contact', 'Contact'],
  ['/faq', 'FAQ'],
  ['/blog', 'Journal'],
  ['/privacy-policy', 'Privacy Policy'],
  ['/terms-and-conditions', 'Terms & Conditions'],
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footgrid">
          <div>
            <SiteLogo alt="PIC PRO" width={100} />
            <p className="muted" style={{ maxWidth: 360, lineHeight: 1.9 }}>
              Capturing moments. Creating memories. Photography, filmmaking and meaningful stories for every celebration.
            </p>
          </div>
          <div>
            <p className="eyebrow">Explore</p>
            {exploreLinks.map(([href, label]) => <Link key={href} href={href} prefetch={false}>{label}</Link>)}
          </div>
          <div>
            <p className="eyebrow">Information</p>
            {informationLinks.map(([href, label]) => <Link key={href} href={href} prefetch={false}>{label}</Link>)}
            <address className="muted" style={{ fontSize: 13, fontStyle: 'normal' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '12px 0' }}>
                <Phone aria-hidden="true" size={19} color="#ff5148" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ lineHeight: 1.5 }}>
                  <a href="tel:+917366030490" style={{ margin: 0, fontSize: 16 }}>+91 73660 30490</a>
                  <a href="tel:+919334008028" style={{ margin: 0, fontSize: 16 }}>+91 93340 08028</a>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, lineHeight: 1.5 }}>
                <MapPin aria-hidden="true" size={19} color="#ff5148" style={{ flexShrink: 0 }} />
                <span>Subash Electric Shop, Bichkurwa</span>
              </div>
            </address>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #333', marginTop: 45, paddingTop: 25, color: '#888', fontSize: 12 }}>
          © {new Date().getFullYear()} PIC PRO Photography &amp; Videography. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
