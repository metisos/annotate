import { WEB_BASE_URL } from './config';

export class AuthExpiredError extends Error {
  constructor() {
    super('Your session has expired. Please sign in again.');
  }
}

async function authed<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${WEB_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...init.headers,
    },
  });
  if (res.status === 401) throw new AuthExpiredError();
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? `${path} failed (HTTP ${res.status})`);
  }
  return (await res.json()) as T;
}

export async function publishTextAnnotation(payload: {
  source: { url: string; title?: string; ogImage?: string; author?: string };
  textContent: { selectedText: string; context?: string };
  commentary: { text: string; aiGenerated?: boolean };
}): Promise<{ slug: string; status: string }> {
  const { annotation } = await authed<{ annotation: { slug: string; status: string } }>(
    '/api/clips',
    { method: 'POST', body: JSON.stringify({ type: 'text', ...payload }) },
  );
  return annotation;
}

export async function publishMediaAnnotation(payload: {
  type: 'video' | 'audio';
  source: { url: string; title?: string; ogImage?: string };
  clip: { startTime: number; endTime: number };
  commentary: { text: string };
}): Promise<{ slug: string; status: string }> {
  const { annotation } = await authed<{ annotation: { slug: string; status: string } }>(
    '/api/clips',
    { method: 'POST', body: JSON.stringify(payload) },
  );
  return annotation;
}

export const publishVideoAnnotation = (payload: {
  source: { url: string; title?: string; ogImage?: string };
  clip: { startTime: number; endTime: number };
  commentary: { text: string };
}) => publishMediaAnnotation({ type: 'video', ...payload });

export async function getDraftPreview(payload: {
  source: { url: string; title?: string };
  selectedText: string;
}): Promise<{ draftText: string; suggestedTags: string[]; keyClaims: string[] }> {
  const { draft } = await authed<{ draft: { draftText: string; suggestedTags: string[]; keyClaims: string[] } }>(
    '/api/agent/draft-preview',
    { method: 'POST', body: JSON.stringify(payload) },
  );
  return draft;
}

export async function suggestMoments(youtubeUrl: string): Promise<
  Array<{ startTime: number; endTime: number; label: string }>
> {
  const { moments } = await authed<{ moments: Array<{ startTime: number; endTime: number; label: string }> }>(
    '/api/agent/suggest',
    { method: 'POST', body: JSON.stringify({ youtubeUrl }) },
  );
  return moments;
}

export async function getAnnotationStatus(
  slug: string,
): Promise<{ status: string; clip?: { mediaUrl?: string } }> {
  const res = await fetch(`${WEB_BASE_URL}/api/clips/${slug}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`status fetch failed (HTTP ${res.status})`);
  const j = (await res.json()) as { annotation: { status: string; clip?: { mediaUrl?: string } } };
  return j.annotation;
}
