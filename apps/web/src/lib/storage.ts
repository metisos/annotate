import { Storage } from '@google-cloud/storage';

let _client: Storage | null = null;

function getClient(): Storage {
  if (_client) return _client;
  _client = new Storage({ projectId: process.env.GCP_PROJECT_ID });
  return _client;
}

export function getClipsBucket() {
  const name = process.env.ANNOTATE_CLIPS_BUCKET;
  if (!name) throw new Error('ANNOTATE_CLIPS_BUCKET is not set');
  return getClient().bucket(name);
}

export interface UploadedFile {
  path: string;
  publicUrl: string;
  size: number;
  contentType: string;
}

export async function uploadClipFile(input: {
  userId: string;
  annotationId: string;
  filename: string;
  data: Buffer;
  contentType: string;
}): Promise<UploadedFile> {
  const bucket = getClipsBucket();
  const path = `clips/${input.userId}/${input.annotationId}/${input.filename}`;
  const file = bucket.file(path);
  await file.save(input.data, {
    contentType: input.contentType,
    resumable: false,
    metadata: { cacheControl: 'public, max-age=31536000, immutable' },
  });
  return {
    path,
    publicUrl: `https://storage.googleapis.com/${bucket.name}/${path}`,
    size: input.data.byteLength,
    contentType: input.contentType,
  };
}

export async function uploadAvatar(input: {
  userId: string;
  data: Buffer;
  contentType: string;
}): Promise<UploadedFile> {
  const bucket = getClipsBucket();
  // Bust caches with a short hash so updated avatars show up immediately.
  const stamp = Date.now().toString(36);
  const ext = input.contentType === 'image/png' ? 'png' : input.contentType === 'image/webp' ? 'webp' : 'jpg';
  const path = `avatars/${input.userId}/${stamp}.${ext}`;
  const file = bucket.file(path);
  await file.save(input.data, {
    contentType: input.contentType,
    resumable: false,
    metadata: { cacheControl: 'public, max-age=31536000, immutable' },
  });
  return {
    path,
    publicUrl: `https://storage.googleapis.com/${bucket.name}/${path}`,
    size: input.data.byteLength,
    contentType: input.contentType,
  };
}
