import type { Metadata } from 'next';
import OpenWhatsAppPhotos from './OpenWhatsAppPhotos';

export const metadata: Metadata = {
  title: 'Open Your Event Photos',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function WhatsAppPhotoPage() {
  return <OpenWhatsAppPhotos />;
}
