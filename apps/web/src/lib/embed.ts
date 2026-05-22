import { GoogleGenAI } from '@google/genai';

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (_client) return _client;
  const project = process.env.GCP_PROJECT_ID;
  if (!project) throw new Error('GCP_PROJECT_ID is not set');
  const location = process.env.VERTEX_LOCATION ?? 'us-central1';
  _client = new GoogleGenAI({ vertexai: true, project, location });
  return _client;
}

export const EMBEDDING_MODEL = 'text-embedding-005';
export const EMBEDDING_DIM = 768;

/** L2-normalize a vector in place; returns it for chaining. */
export function l2norm(v: number[]): number[] {
  let sumSq = 0;
  for (const x of v) sumSq += x * x;
  if (sumSq <= 0) return v;
  const norm = Math.sqrt(sumSq);
  for (let i = 0; i < v.length; i++) v[i] = (v[i] ?? 0) / norm;
  return v;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return dot;
}

/** Trim input to a safe length for the embedding model. */
function clamp(text: string, maxChars = 6000): string {
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

/**
 * Embed one document. Returns an L2-normalized 768-d vector.
 */
export async function embedText(text: string): Promise<number[]> {
  if (!text.trim()) throw new Error('cannot embed empty text');
  const client = getClient();
  const res = await client.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [clamp(text)],
  });
  const values = res.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error('Vertex embedding returned no vector');
  }
  return l2norm([...values]);
}

/**
 * Batch embed multiple documents. Vertex accepts up to 250 inputs per call;
 * we cap at 50 here to stay within reasonable request sizes.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const client = getClient();
  const BATCH = 50;
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH).map((t) => clamp(t));
    const res = await client.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: slice,
    });
    const vectors = res.embeddings ?? [];
    for (const v of vectors) {
      const values = v?.values;
      if (!values) throw new Error('Vertex embedding returned a null vector in batch');
      out.push(l2norm([...values]));
    }
  }
  return out;
}
