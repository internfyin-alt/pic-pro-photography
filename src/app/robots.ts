import type { MetadataRoute } from 'next';
import { publicSiteOrigin } from '@/lib/site-origin';

export default function robots(): MetadataRoute.Robots {
  const origin = publicSiteOrigin();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/client', '/api/', '/photo-sharing/studio', '/photo-sharing/g/', '/photo-sharing/all-events/'],
    },
    sitemap: origin ? new URL('/sitemap.xml', origin).href : undefined,
  };
}
