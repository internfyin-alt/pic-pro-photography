import { StudioTheme } from './StudioTheme';

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <StudioTheme>{children}</StudioTheme>;
}
