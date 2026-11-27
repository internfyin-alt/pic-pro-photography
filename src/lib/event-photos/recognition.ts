import {
  CreateCollectionCommand, DeleteCollectionCommand, DeleteFacesCommand, DetectFacesCommand,
  IndexFacesCommand, ListFacesCommand, RekognitionClient, SearchFacesByImageCommand,
} from '@aws-sdk/client-rekognition';
import sharp from 'sharp';
import { maxGuestMatches, originalBucket } from './constants';
import { dbRequired, dbResult, PhotoError, previewPath, type EventPhoto, type PhotoDb } from './server';

function recognition() {
  const region = process.env.PICPRO_REKOGNITION_REGION;
  if (!region) throw new PhotoError('Face recognition is awaiting configuration.', 503);
  return new RekognitionClient({ region, maxAttempts: 2 });
}

const collection = (id: string) => 'picpro-' + id;

function named(error: unknown, name: string) {
  return error instanceof Error && error.name === name;
}

async function imageBytes(input: ArrayBuffer, maxSize = 1920) {
  try {
    const pipeline = sharp(Buffer.from(input), { limitInputPixels: 60_000_000 });
    const { format } = await pipeline.metadata();
    if (!format || !['jpeg', 'png', 'webp'].includes(format)) throw new Error('unsupported format');
    const image = await pipeline.rotate().resize({
      width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true,
    }).flatten({ background: '#fff' }).jpeg({ quality: 82 }).toBuffer();
    return image;
  } catch {
    throw new PhotoError('Use a readable JPG, PNG or WebP image.');
  }
}

async function removeFaces(client: RekognitionClient, collectionId: string, photoId: string) {
  const faces: string[] = [];
  let next: string | undefined;
  do {
    const page = await client.send(new ListFacesCommand({ CollectionId: collectionId, NextToken: next, MaxResults: 1000 }));
    for (const face of page.Faces ?? []) {
      if (face.ExternalImageId === photoId && face.FaceId) faces.push(face.FaceId);
    }
    next = page.NextToken;
  } while (next);
  if (faces.length) await client.send(new DeleteFacesCommand({ CollectionId: collectionId, FaceIds: faces }));
}

export async function removePhotoFaces(eventId: string, photoId: string) {
  try {
    await removeFaces(recognition(), collection(eventId), photoId);
  } catch (error) {
    if (!named(error, 'ResourceNotFoundException')) throw error;
  }
}

export async function removeEventCollection(eventId: string) {
  try {
    await recognition().send(new DeleteCollectionCommand({ CollectionId: collection(eventId) }));
  } catch (error) {
    if (!named(error, 'ResourceNotFoundException')) throw error;
  }
}

export async function processNextPhoto(db: PhotoDb, eventId?: string) {
  const client = recognition();
  const jobs = dbResult(await db.rpc('claim_event_photo', { p_event: eventId ?? null })) as EventPhoto[];
  const photo = jobs[0];
  if (!photo) return false;
  const collectionId = collection(photo.event_id);
  try {
    const file = dbRequired(await db.storage.from(originalBucket).download(photo.storage_path), 'Photo file unavailable.');
    if (file.size !== photo.byte_size) throw new PhotoError('Upload size changed. Remove this photo and upload it again.');
    const bytes = await imageBytes(await file.arrayBuffer());
    const preview = await sharp(bytes).resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer();
    dbResult(await db.storage.from(originalBucket).upload(previewPath(photo.storage_path), preview, {
      upsert: true, contentType: 'image/jpeg', cacheControl: '60',
    }));
    const input = { CollectionId: collectionId, ExternalImageId: photo.id, Image: { Bytes: bytes }, QualityFilter: 'AUTO' as const };
    let result;
    try {
      result = await client.send(new IndexFacesCommand(input));
    } catch (error) {
      if (!named(error, 'ResourceNotFoundException')) throw error;
      try {
        await client.send(new CreateCollectionCommand({ CollectionId: collectionId }));
      } catch (createError) {
        if (!named(createError, 'ResourceAlreadyExistsException')) throw createError;
      }
      result = await client.send(new IndexFacesCommand(input));
    }
    dbResult(await db.from('event_photos').update({
      status: 'ready', face_count: result.FaceRecords?.length ?? 0, lease_until: null, job_token: null,
    }).eq('id', photo.id).eq('job_token', photo.job_token));
  } catch (error) {
    if (!(error instanceof PhotoError)) console.error('Face indexing failed:', error instanceof Error ? error.name : 'Unknown');
    dbResult(await db.from('event_photos').update({
      status: 'failed',
      error: error instanceof PhotoError ? error.message : 'Face indexing failed. Retry after checking the recognition setup.',
      lease_until: null, job_token: null,
    }).eq('id', photo.id).eq('job_token', photo.job_token));
  }
  return true;
}

async function checkSelfie(client: RekognitionClient, Image: { Bytes: Uint8Array }) {
  const detected = await client.send(new DetectFacesCommand({ Image })).catch((error: unknown) => {
    console.error('Guest selfie verification failed:', error instanceof Error ? error.name : 'Unknown');
    throw new PhotoError('Selfie verification is temporarily unavailable. Please contact your photographer.', 503);
  });
  if (detected.FaceDetails?.length !== 1) {
    throw new PhotoError('Use a clear selfie with exactly one face.');
  }
}

export async function prepareRegistrationSelfie(selfie: ArrayBuffer) {
  const bytes = await imageBytes(selfie, 960);
  if (bytes.length > 1024 * 1024) throw new PhotoError('Choose a smaller selfie.');
  await checkSelfie(recognition(), { Bytes: bytes });
  return bytes;
}

async function matchSelfie(eventId: string, selfie: Uint8Array, signal?: AbortSignal) {
  const client = recognition();
  const Image = { Bytes: selfie };
  try {
    const matches = await client.send(new SearchFacesByImageCommand({
      Image, CollectionId: collection(eventId), MaxFaces: maxGuestMatches * 4,
      FaceMatchThreshold: 99, QualityFilter: 'HIGH',
    }), { abortSignal: signal });
    return Array.from(new Set((matches.FaceMatches ?? []).flatMap(match =>
      match.Face?.ExternalImageId ? [match.Face.ExternalImageId] : [],
    ))).slice(0, maxGuestMatches);
  } catch (error) {
    if (named(error, 'ResourceNotFoundException')) return [];
    if (named(error, 'InvalidParameterException')) throw new PhotoError('Use a clear, well-lit selfie looking straight at the camera.');
    throw error;
  } finally {
    client.destroy();
  }
}

export async function readyGuestMatches(db: PhotoDb, eventId: string, selfie: string, signal?: AbortSignal) {
  const ids = await matchSelfie(eventId, Buffer.from(selfie.slice(2), 'hex'), signal);
  return ids.length ? dbRequired(await db.from('event_photos')
    .select('id,file_name,byte_size,storage_path').eq('event_id', eventId).eq('status', 'ready').in('id', ids)) : [];
}
