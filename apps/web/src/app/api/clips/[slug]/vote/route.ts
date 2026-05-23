import { NextResponse } from 'next/server';
import { annotations, getAnnotationBySlug, votes } from '@/lib/mongo';
import { getRequestUser } from '@/lib/auth';
import { checkDailyLimit } from '@/lib/rate-limit';

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const me = await getRequestUser(req);
  if (!me) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const { slug } = await params;
  const ann = await getAnnotationBySlug(slug);
  if (!ann) return NextResponse.json({ error: 'annotation not found' }, { status: 404 });

  const userId = String(me._id);
  const limit = await checkDailyLimit(userId, 'vote');
  if (!limit.ok) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });

  const annotationId = String(ann._id);
  const result = await (await votes()).updateOne(
    { userId, annotationId },
    { $setOnInsert: { userId, annotationId, createdAt: new Date() } },
    { upsert: true },
  );

  let count = ann.stats.votes ?? 0;
  if (result.upsertedCount === 1) {
    const updated = await (await annotations()).findOneAndUpdate(
      { _id: ann._id },
      { $inc: { 'stats.votes': 1 } },
      { returnDocument: 'after' },
    );
    count = updated?.stats?.votes ?? count + 1;
  }

  return NextResponse.json({ voted: true, votes: Math.max(0, count) });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const me = await getRequestUser(req);
  if (!me) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const { slug } = await params;
  const ann = await getAnnotationBySlug(slug);
  if (!ann) return NextResponse.json({ error: 'annotation not found' }, { status: 404 });

  const userId = String(me._id);
  const annotationId = String(ann._id);
  const result = await (await votes()).deleteOne({ userId, annotationId });

  let count = ann.stats.votes ?? 0;
  if (result.deletedCount === 1) {
    const updated = await (await annotations()).findOneAndUpdate(
      { _id: ann._id },
      { $inc: { 'stats.votes': -1 } },
      { returnDocument: 'after' },
    );
    count = updated?.stats?.votes ?? count - 1;
  }

  return NextResponse.json({ voted: false, votes: Math.max(0, count) });
}

export async function GET(req: Request, { params }: Ctx) {
  const me = await getRequestUser(req);
  const { slug } = await params;
  const ann = await getAnnotationBySlug(slug);
  if (!ann) return NextResponse.json({ voted: false, votes: 0 });
  const votesCount = Math.max(0, ann.stats.votes ?? 0);
  if (!me) return NextResponse.json({ voted: false, votes: votesCount });
  const v = await (await votes()).findOne({ userId: String(me._id), annotationId: String(ann._id) });
  return NextResponse.json({ voted: Boolean(v), votes: votesCount });
}
