import { isIP } from 'node:net';

function publicOrigin(value?: string) {
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

function shareUrl(path: string, env: NodeJS.ProcessEnv) {
  const configured = env.NEXT_PUBLIC_SITE_URL;
  const vercelDomain = env.VERCEL_PROJECT_PRODUCTION_URL;
  const origin = publicOrigin(configured) ?? (vercelDomain ? publicOrigin('https://' + vercelDomain) : undefined);
  if (origin) return new URL(path, origin).href;

  if (env.NODE_ENV !== 'production' && env.VERCEL_ENV !== 'production' && env.VERCEL_ENV !== 'preview') {
    try {
      const local = new URL(configured ?? '');
      if (['localhost', '127.0.0.1', '[::1]'].includes(local.hostname) &&
        ['http:', 'https:'].includes(local.protocol)) {
        return new URL(path, local.origin).href;
      }
    } catch {
      // Use the default local development port.
    }
    return 'http://localhost:3000' + path;
  }

  return null;
}

export function guestSharePath(token: string) {
  return '/photo-sharing/g/' + encodeURIComponent(token);
}

export function guestShareUrl(token: string, env = process.env) {
  return shareUrl(guestSharePath(token), env);
}

export function allEventsSharePath(token: string) {
  return '/photo-sharing/all-events/' + encodeURIComponent(token);
}

export function allEventsShareUrl(token: string, env = process.env) {
  return shareUrl(allEventsSharePath(token), env);
}

export function whatsappShareUrl(url: string, title: string) {
  return 'https://wa.me/?' + new URLSearchParams({ text: 'Find your photos from ' + title + ': ' + url });
}
