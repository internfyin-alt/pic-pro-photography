import { publicSiteOrigin } from '../site-origin';

function shareUrl(path: string, env: NodeJS.ProcessEnv) {
  const origin = publicSiteOrigin(env);
  if (origin) return new URL(path, origin).href;

  if (env.NODE_ENV !== 'production' && env.VERCEL_ENV !== 'production' && env.VERCEL_ENV !== 'preview') {
    try {
      const local = new URL(env.NEXT_PUBLIC_SITE_URL ?? '');
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
