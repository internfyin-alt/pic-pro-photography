import type { Metadata } from 'next';
import { services } from './content';
import { publicSiteOrigin } from './site-origin';

export const siteName = 'PIC PRO Photography & Videography';

const pages = {
  '/': [siteName, 'PIC PRO offers wedding photography, pre-wedding shoots, engagement and birthday photography, and cinematic videography. Explore services and enquire about your event.'],
  '/about': ['About Our Studio', 'Meet PIC PRO, a creative photography and videography studio covering weddings, private celebrations and corporate events.'],
  '/services': ['Photography & Videography Services', 'Explore wedding and engagement photography, pre-wedding shoots, birthday coverage, drone photography, and cinematic videography from PIC PRO.'],
  '/portfolio': ['Photography Portfolio', 'Explore the PIC PRO sample portfolio, with wedding, pre-wedding, engagement, birthday, drone and cinematic imagery.'],
  '/videos': ['Cinematic Films', 'Explore PIC PRO’s cinematic filmmaking services and enquire about filming your celebration.'],
  '/packages': ['Photography & Videography Packages', 'Explore Essential, Premium and Signature event coverage and request a personalised photography or videography quote.'],
  '/booking': ['Book Your Shoot', 'Send PIC PRO a photography or videography enquiry for your wedding or special event.'],
  '/contact': ['Contact Us', 'Contact PIC PRO Photography & Videography about availability, event coverage, and custom quotes.'],
  '/faq': ['Frequently Asked Questions', 'Find answers about booking a PIC PRO shoot, combining photography and videography, and customising event coverage.'],
  '/blog': ['Journal', 'The PIC PRO Photography & Videography journal.'],
  '/testimonials': ['Testimonials', 'The testimonials page for PIC PRO Photography & Videography.'],
  '/privacy-policy': ['Privacy Policy', 'Read how PIC PRO Photography & Videography handles personal information.'],
  '/terms-and-conditions': ['Terms & Conditions', 'Read the terms for PIC PRO Photography & Videography bookings and services.'],
  '/photo-sharing': ['Event Photo Sharing', 'Private QR event galleries and selfie-based photo discovery for PIC PRO guests.'],
  '/photo-sharing/features': ['Photo Sharing Features', 'See how private event galleries, QR access and selfie matching help guests find their photos with PIC PRO.'],
  '/photo-sharing/how-it-works': ['How Event Photo Sharing Works', 'Learn how photographers share PIC PRO event photos and how guests scan the event QR code to find their photos.'],
} as const;

export const publicPagePaths = [...Object.keys(pages), ...services.map(service => '/services/' + service.slug)];

const defaultImage = '/photos/hero-1440.b5ae7d8fed.webp';

function pageMetadata(path: string, title: string, description: string, image = defaultImage): Metadata {
  const origin = publicSiteOrigin();
  const url = origin ? new URL(path, origin).href : undefined;
  const images = origin ? [{ url: new URL(image, origin).href }] : undefined;
  const socialTitle = path === '/' ? title : title + ' | PIC PRO';

  return {
    title: path === '/' ? { absolute: title } : title,
    description,
    alternates: url ? { canonical: url } : undefined,
    openGraph: { type: 'website', title: socialTitle, description, siteName, url, images },
    twitter: { card: 'summary_large_image', title: socialTitle, description, images },
  };
}

export function publicMetadata(path: keyof typeof pages) {
  const [title, description] = pages[path];
  return pageMetadata(path, title, description);
}

export function serviceMetadata(service: typeof services[number]) {
  return pageMetadata('/services/' + service.slug, service.title,
    service.description + ' Explore ' + service.title.toLowerCase() + ' with PIC PRO and request a custom quote.',
    service.image.src);
}

export function homepageStructuredData() {
  const origin = publicSiteOrigin();
  if (!origin) return null;
  const url = origin + '/';
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': url + '#website', url, name: siteName, alternateName: 'PIC PRO', publisher: { '@id': url + '#organization' } },
      { '@type': 'Organization', '@id': url + '#organization', url, name: siteName, logo: url + 'icon.png' },
    ],
  };
}
