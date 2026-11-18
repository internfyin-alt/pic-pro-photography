import PhotographerAuth from '@/components/event-photos/PhotographerAuth';

export const metadata = { title: 'Photographer Login', robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  return <PhotographerAuth status={(await searchParams).status} />;
}
