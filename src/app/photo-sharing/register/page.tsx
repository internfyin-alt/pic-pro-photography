import PhotographerAuth from '@/components/event-photos/PhotographerAuth';

export const metadata = { title: 'Photographer Registration', robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  return <PhotographerAuth register status={(await searchParams).status} />;
}
