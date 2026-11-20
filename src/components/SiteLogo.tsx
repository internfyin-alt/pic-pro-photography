const logo = '/photos/logo-100.2073ac9aed.webp';
const logo2x = '/photos/logo-200.cda338af40.webp';

export default function SiteLogo({ alt, width, eager = false }: { alt: string; width: 72 | 100; eager?: boolean }) {
  return (
    <img
      src={logo}
      srcSet={logo + ' 1x, ' + logo2x + ' 2x'}
      alt={alt}
      width={width}
      height={Math.round(width * 284 / 315)}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      style={eager ? { objectFit: 'contain' } : undefined}
    />
  );
}
