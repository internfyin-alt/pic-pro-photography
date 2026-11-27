import Link from 'next/link';
import { Facebook, Instagram, MapPin, Phone } from 'lucide-react';
import SiteLogo from './SiteLogo';

const whatsappNumber = '917366030490';

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
            <div className="footer-socials">
              <a
                href="https://www.instagram.com/picpro_videography/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="PIC PRO on Instagram"
              >
                <Instagram aria-hidden="true" size={20} />
              </a>
              <span role="img" aria-label="Facebook">
                <Facebook aria-hidden="true" size={20} />
              </span>
            </div>
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
                  <a href={`tel:+${whatsappNumber}`} style={{ margin: 0, fontSize: 16 }}>+91 73660 30490</a>
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
      <a
        className="whatsapp-float"
        href={`https://wa.me/${whatsappNumber}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with PIC PRO on WhatsApp"
      >
        <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.174.199-.347.224-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479s1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.693.626.712.226 1.36.194 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 0 1-5.031-1.377l-.361-.214-3.741.981.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.003-5.45 4.437-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.9 9.825 9.825 0 0 1 2.893 6.992c-.002 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
      </a>
    </footer>
  );
}
