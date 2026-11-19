import type { Photo } from '@/lib/photos';

type PublicPhotoProps = {
  photo: Photo;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
};

export default function PublicPhoto({ photo, alt, sizes, className, priority }: PublicPhotoProps) {
  // These images are already resized and encoded, with immutable URLs.
  return (
    <img
      alt={alt}
      className={className}
      width={photo.width}
      height={photo.height}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      sizes={sizes}
      srcSet={photo.srcSet}
      src={photo.src}
    />
  );
}
