import { isIP } from 'node:net';

function httpsOrigin(value?: string) {
  try {
    const url = new URL(value?.trim() ?? '');
    const hostname = url.hostname.replace(/\.$/, '');
    if (url.protocol === 'https:' && !url.username && !url.password &&
      hostname.includes('.') && !hostname.endsWith('.localhost') &&
      !hostname.endsWith('.local') && !isIP(hostname)) {
      return url.origin;
    }
  } catch {
    // An unset or invalid URL can fall back to the production domain.
  }
}

export function publicSiteOrigin(env = process.env) {
  return httpsOrigin(env.NEXT_PUBLIC_SITE_URL) ??
    (env.VERCEL_PROJECT_PRODUCTION_URL ? httpsOrigin('https://' + env.VERCEL_PROJECT_PRODUCTION_URL) : undefined);
}
