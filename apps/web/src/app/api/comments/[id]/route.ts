import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { annotations, comments } from '@/lib/mongo';
import { getRequestUser } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, { params }: Ctx) {
  const me = await getRequestUser(req);
  if (!me) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f]{24}$/i.test(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }
  const col = await comments();
  const cmt = await col.findOne({ _id: new ObjectId(id) } as unknown as Parameters<typeof col.findOne>[0]);
  if (!cmt) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (cmt.userId !== String(me._id)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  await col.deleteOne({ _id: new ObjectId(id) } as unknown as Parameters<typeof col.findOne>[0]);
  const annCol = await annotations();
  await annCol.updateOne(
    { _id: new ObjectId(cmt.annotationId) } as unknown as Parameters<typeof annCol.findOne>[0],
    { $inc: { 'stats.comments': -1 } },
  );
  return NextResponse.json({ ok: true });
}
