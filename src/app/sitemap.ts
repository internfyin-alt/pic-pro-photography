import type { MetadataRoute } from 'next';
import { publicPagePaths } from '@/lib/seo';
import { publicSiteOrigin } from '@/lib/site-origin';

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = publicSiteOrigin();
  return origin ? publicPagePaths.map(path => ({ url: new URL(path, origin).href })) : [];
}
