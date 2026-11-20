import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [{ db, user }, { id }] = await Promise.all([requireRole('client'), params]);
  const { data: gallery } = await db.from('client_galleries').select('id,title,description').eq('id', id).eq('client_id', user.id).single();
  if (!gallery) notFound();

  const { data: images } = await db.from('client_gallery_images').select('storage_path,file_name').eq('gallery_id', id);
  const paths = [...new Set((images ?? []).map(image => image.storage_path))];
  const bucket = db.storage.from('client-gallery-files');
  const expiry = 120;
  const batchSize = 100;
  const batches = Array.from({ length: Math.ceil(paths.length / batchSize) }, (_, index) =>
    paths.slice(index * batchSize, (index + 1) * batchSize),
  );
  const signed = await Promise.all(batches.map(async batch => {
    const { data, error } = await bucket.createSignedUrls(batch, expiry);
    if (error) {
      return Promise.all(batch.map(async path => {
        const { data: signedFile } = await bucket.createSignedUrl(path, expiry);
        return { path, signedUrl: signedFile?.signedUrl };
      }));
    }
    return data;
  }));
  const urls = new Map(signed.flat().map(({ path, signedUrl }) => [path, signedUrl]));

  return (
    <main className="section container">
      <h1 className="heading">{gallery.title}</h1>
      <p className="muted">{gallery.description}</p>
      <div className="grid3">
        {(images ?? []).map((image, index) => {
          const url = urls.get(image.storage_path);
          return url && (
            <a key={index} href={url} target="_blank" rel="noreferrer">
              <img src={url} alt={image.file_name || 'Private gallery photo'} style={{ width: '100%' }} />
            </a>
          );
        })}
      </div>
    </main>
  );
}
