import { Sandbox } from 'e2b';

export async function withSandbox<T>(fn: (sbx: Sandbox) => Promise<T>): Promise<T> {
  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) throw new Error('E2B_API_KEY is not set');
  const sbx = await Sandbox.create({ apiKey, timeoutMs: 120_000 });
  try {
    return await fn(sbx);
  } finally {
    await sbx.kill();
  }
}
