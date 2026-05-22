import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { annotations, comments } from '@/lib/mongo';
import { getRequestUser } from '@/lib/auth';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const annotationId = url.searchParams.get('annotationId');
  if (!annotationId) {
    return NextResponse.json({ error: 'annotationId required' }, { status: 400 });
  }
  const col = await comments();
  const rows = await col.find({ annotationId }).sort({ createdAt: -1 }).limit(200).toArray();
  return NextResponse.json({ comments: rows });
}

export async function POST(req: Request) {
  const me = await getRequestUser(req);
  if (!me) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const body = (await req.json()) as { annotationId?: string; slug?: string; text?: string; parentId?: string };
  const text = body.text?.trim();
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: 'text too long' }, { status: 400 });

  const annCol = await annotations();
  let ann;
  if (body.annotationId && /^[0-9a-f]{24}$/i.test(body.annotationId)) {
    ann = await annCol.findOne({ _id: new ObjectId(body.annotationId) } as unknown as Parameters<typeof annCol.findOne>[0]);
  } else if (body.slug) {
    ann = await annCol.findOne({ slug: body.slug });
  }
  if (!ann) return NextResponse.json({ error: 'annotation not found' }, { status: 404 });

  const now = new Date();
  const annotationId = String(ann._id);
  const doc = {
    annotationId,
    userId: String(me._id),
    parentId: body.parentId ?? null,
    text,
    createdAt: now,
  };
  const ins = await (await comments()).insertOne(doc);
  await annCol.updateOne({ _id: ann._id }, { $inc: { 'stats.comments': 1 } });

  return NextResponse.json({
    comment: { ...doc, _id: ins.insertedId.toString() },
  });
}
