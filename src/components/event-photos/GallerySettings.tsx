import { ScanFace, Smartphone } from 'lucide-react';
import styles from '@/app/photo-sharing/studio/Studio.module.css';

export type GallerySettingsValues = {
  guestDownloadsEnabled: boolean;
  faceSearchEnabled: boolean;
  guestPhoneRequired: boolean;
};

export function readGallerySettings(form: FormData): GallerySettingsValues {
  return {
    guestDownloadsEnabled: form.get('photoDownloads') === 'free',
    faceSearchEnabled: form.get('faceSearch') === 'on',
    guestPhoneRequired: form.get('guestPhone') === 'on',
  };
}

export default function GallerySettings({
  guestDownloadsEnabled = false, faceSearchEnabled = true, guestPhoneRequired = true,
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
    <div className={styles.formGrid}>
      <div className={styles.setupCard}>
        <div className={styles.settingHeading}>
          <ScanFace size={21} aria-hidden="true" />
          <label><input type="checkbox" name="faceSearch" defaultChecked={faceSearchEnabled} />Allow Face Search</label>
        </div>
        <p>Guests find their photos with a selfie. Turning this off pauses guest sharing for this gallery.</p>
      </div>
      <div className={styles.setupCard}>
        <div className={styles.settingHeading}>
          <Smartphone size={21} aria-hidden="true" />
          <label><input type="checkbox" name="guestPhone" defaultChecked={guestPhoneRequired} />Guest Registration with Mobile</label>
        </div>
        <p>Require a mobile number when guests register. Registration uses the guest’s selfie and personal photo link.</p>
      </div>
    </div>
  </div>;
}
