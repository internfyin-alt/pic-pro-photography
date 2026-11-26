import { ScanFace } from 'lucide-react';
import styles from '@/app/photo-sharing/studio/Studio.module.css';

export type GallerySettingsValues = {
  guestDownloadsEnabled: boolean;
  faceSearchEnabled: boolean;
};

export function readGallerySettings(form: FormData): GallerySettingsValues {
  return {
    guestDownloadsEnabled: form.get('photoDownloads') === 'free',
    faceSearchEnabled: form.get('faceSearch') === 'on',
  };
}

export default function GallerySettings({
  guestDownloadsEnabled = false, faceSearchEnabled = true,
}: Partial<GallerySettingsValues>) {
  return <div className={styles.gallerySettings}>
    <fieldset className={styles.formSection}>
      <legend>Photo Download</legend>
      <div className={styles.radioOptions}>
        <label><input type="radio" name="photoDownloads" value="disabled" defaultChecked={!guestDownloadsEnabled} />Disabled</label>
        <label><input type="radio" name="photoDownloads" value="free" defaultChecked={guestDownloadsEnabled} />Free</label>
      </div>
      <p>Guests can preview matching photos in both modes. Free lets them download originals.</p>
    </fieldset>
    <div className={styles.setupCard}>
      <div className={styles.settingHeading}>
        <ScanFace size={21} aria-hidden="true" />
        <label><input type="checkbox" name="faceSearch" defaultChecked={faceSearchEnabled} />Allow Face Search</label>
      </div>
      <p>Guests find their photos with a selfie. Turning this off pauses guest sharing for this gallery.</p>
    </div>
  </div>;
}
