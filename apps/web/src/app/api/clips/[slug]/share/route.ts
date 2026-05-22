import { NextResponse } from 'next/server';
import { annotations } from '@/lib/mongo';

type Ctx = { params: Promise<{ slug: string }> };

const VALID_CHANNELS = new Set([
  'copy',
  'native',
  'x',
  'linkedin',
  'reddit',
  'threads',
  'bluesky',
  'email',
]);

export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const { channel } = (await req.json().catch(() => ({}))) as { channel?: string };
  if (!channel || !VALID_CHANNELS.has(channel)) {
    return NextResponse.json({ error: 'invalid channel' }, { status: 400 });
  }
  const col = await annotations();
  await col.updateOne({ slug }, { $inc: { 'stats.shares': 1 } });
  return NextResponse.json({ ok: true });
}
