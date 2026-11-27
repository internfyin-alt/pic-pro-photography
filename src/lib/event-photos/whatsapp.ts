import { createHmac, timingSafeEqual } from 'node:crypto';
import { publicSiteOrigin } from '../site-origin';
import { readyGuestMatches } from './recognition';
import { dbResult, hashToken, sharedEvent, validToken, type PhotoDb } from './server';

const templateName = 'picpro_photos_ready';
const signedAccessKey = /^[a-f0-9]{128}$/;
const retryMinutes = 15;

function linkSecret() {
  const secret = process.env.WHATSAPP_LINK_SECRET;
  return secret && secret.length >= 32 ? secret : undefined;
}

function whatsappConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const secret = linkSecret();
  if (accessToken && phoneNumberId && /^\d+$/.test(phoneNumberId) && secret && publicSiteOrigin()) {
    return { accessToken, phoneNumberId, secret };
  }
}

export function whatsappNotificationsEnabled() {
  return Boolean(whatsappConfig());
}

function whatsappSignature(secret: string, eventToken: string, registrationHash: string) {
  return createHmac('sha256', secret).update('picpro-whatsapp-guest:' + eventToken + ':' + registrationHash).digest('hex');
}

export function guestRegistrationHash(eventToken: string, accessKey: string) {
  if (validToken(accessKey)) return hashToken(accessKey);
  const secret = linkSecret();
  if (!secret || !validToken(eventToken) || !signedAccessKey.test(accessKey)) return undefined;
  const registrationHash = accessKey.slice(0, 64);
  const signature = whatsappSignature(secret, eventToken, registrationHash);
  if (timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(accessKey.slice(64), 'hex'))) {
    return registrationHash;
  }
}

type Notification = {
  token_hash: string;
  event_id: string;
  phone: string;
  selfie_jpeg: string;
  claim_id: string;
  share_token: string;
};

type WhatsAppConfig = NonNullable<ReturnType<typeof whatsappConfig>>;

async function sendWhatsApp(config: WhatsAppConfig, job: Notification) {
  const accessKey = job.token_hash + whatsappSignature(config.secret, job.share_token, job.token_hash);
  const response = await fetch('https://graph.facebook.com/v27.0/' + config.phoneNumberId + '/messages', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + config.accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: job.phone.replace(/^\+/, ''),
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en_US' },
        components: [{
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: job.share_token + accessKey }],
        }],
      },
    }),
    signal: AbortSignal.timeout(6_000),
  });
  if (!response.ok) {
    const details = await response.json().catch(() => null);
    console.error('WhatsApp photo template rejected:', response.status,
      typeof details?.error?.code === 'number' ? details.error.code : undefined);
    return false;
  }
  return true;
}

async function processNotification(db: PhotoDb, config: WhatsAppConfig, eventId?: string) {
  const [job] = dbResult(await db.rpc('claim_guest_whatsapp_notification', {
    p_event: eventId ?? null,
  })) as Notification[];
  if (!job) return false;

  const activeClaim = () => db.from('photo_guest_registrations').select('token_hash')
    .eq('token_hash', job.token_hash).eq('whatsapp_claim_id', job.claim_id)
    .gt('expires_at', new Date().toISOString()).gt('whatsapp_claim_until', new Date().toISOString()).maybeSingle();
  let sent = false;
  let retry = false;
  try {
    const matches = await readyGuestMatches(db, job.event_id, job.selfie_jpeg, AbortSignal.timeout(6_000));
    if (matches.length) {
      const event = await sharedEvent(db, job.share_token);
      const registration = dbResult(await activeClaim());
      if (event.id === job.event_id && registration) {
        sent = await sendWhatsApp(config, job);
        retry = !sent;
      }
    }
  } catch (error) {
    retry = true;
    console.error('WhatsApp photo notification failed:', error instanceof Error ? error.name : 'Unknown');
  }

  dbResult(await db.from('photo_guest_registrations').update({
    whatsapp_claim_id: null,
    whatsapp_claim_until: null,
    ...(sent && { whatsapp_sent_at: new Date().toISOString(), whatsapp_next_attempt_at: null }),
    ...(retry && { whatsapp_next_attempt_at: new Date(Date.now() + retryMinutes * 60_000).toISOString() }),
  }).eq('token_hash', job.token_hash).eq('whatsapp_claim_id', job.claim_id));
  return true;
}

export async function sendPendingWhatsApp(db: PhotoDb, deadline: number, eventId?: string) {
  const config = whatsappConfig();
  if (!config) return;

  const work = async () => {
    try {
      while (Date.now() < deadline && await processNotification(db, config, eventId)) {
        // Each claim reserves one registration until it is processed or the lease expires.
      }
    } catch (error) {
      console.error('WhatsApp photo queue failed:', error instanceof Error ? error.name : 'Unknown');
    }
  };
  await Promise.all([work(), work(), work()]);
}
