import type { Photo } from '@/lib/photos';

type PublicPhotoProps = {
  photo: Photo;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
};

export default function PublicPhoto({ photo, alt, sizes, className, priority }: PublicPhotoProps) {
  const image = (
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

  if (!photo.avifSrcSet) return image;

  return (
    <>
      {priority && (
        <link rel="preload" as="image" type="image/avif" imageSrcSet={photo.avifSrcSet} imageSizes={sizes} fetchPriority="high" />
      )}
      <picture className="public-picture">
        <source type="image/avif" srcSet={photo.avifSrcSet} sizes={sizes} />
        {image}
      </picture>
    </>
  );
}
