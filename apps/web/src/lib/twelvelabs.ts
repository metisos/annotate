import { TwelveLabs } from 'twelvelabs-js';

let _client: TwelveLabs | null = null;

export function getTwelveLabs(): TwelveLabs {
  if (_client) return _client;
  const apiKey = process.env.TWELVELABS_API_KEY;
  if (!apiKey) throw new Error('TWELVELABS_API_KEY is not set');
  _client = new TwelveLabs({ apiKey });
  return _client;
}

export function getIndexId(): string {
  const id = process.env.TWELVELABS_INDEX_ID;
  if (!id) throw new Error('TWELVELABS_INDEX_ID is not set');
  return id;
}
