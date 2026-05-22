import { GoogleGenAI, type Schema } from '@google/genai';

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (_client) return _client;
  const project = process.env.GCP_PROJECT_ID;
  if (!project) throw new Error('GCP_PROJECT_ID is not set');
  const location = process.env.VERTEX_LOCATION ?? 'us-central1';
  _client = new GoogleGenAI({ vertexai: true, project, location });
  return _client;
}

export function getModelName(): string {
  return process.env.GEMINI_MODEL ?? 'gemini-2.5-pro';
}

export async function generateJSON<T>(input: {
  system: string;
  user: string;
  schema?: Schema;
}): Promise<T> {
  const client = getClient();
  const res = await client.models.generateContent({
    model: getModelName(),
    contents: [{ role: 'user', parts: [{ text: input.user }] }],
    config: {
      systemInstruction: input.system,
      responseMimeType: 'application/json',
      ...(input.schema ? { responseSchema: input.schema } : {}),
    },
  });

  const text = res.text;
  if (!text) {
    throw new Error('Gemini returned no text');
  }
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new Error(`Gemini JSON parse failed: ${(e as Error).message}; raw=${text.slice(0, 400)}`);
  }
}

export async function generateJSONWithVideo<T>(input: {
  system: string;
  user: string;
  videoUrl: string;
  schema?: Schema;
}): Promise<T> {
  const client = getClient();
  const res = await client.models.generateContent({
    model: getModelName(),
    contents: [
      {
        role: 'user',
        parts: [
          { fileData: { fileUri: input.videoUrl, mimeType: 'video/*' } },
          { text: input.user },
        ],
      },
    ],
    config: {
      systemInstruction: input.system,
      responseMimeType: 'application/json',
      ...(input.schema ? { responseSchema: input.schema } : {}),
    },
  });
  const text = res.text;
  if (!text) throw new Error('Gemini returned no text');
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new Error(`Gemini JSON parse failed: ${(e as Error).message}; raw=${text.slice(0, 400)}`);
  }
}
