import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { follows, users } from '@/lib/mongo';
import { getRequestUser } from '@/lib/auth';

type Ctx = { params: Promise<{ userId: string }> };

async function loadTarget(userId: string) {
  const col = await users();
  // Accept either ObjectId hex string or handle
  if (/^[0-9a-f]{24}$/i.test(userId)) {
    const target = await col.findOne({ _id: new ObjectId(userId) } as unknown as Parameters<typeof col.findOne>[0]);
    if (target) return target;
  }
  return col.findOne({ handle: userId.toLowerCase() });
}

export async function POST(req: Request, { params }: Ctx) {
  const me = await getRequestUser(req);
  if (!me) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const { userId } = await params;
  const target = await loadTarget(userId);
  if (!target) return NextResponse.json({ error: 'user not found' }, { status: 404 });

  const followerId = String(me._id);
  const followingId = String(target._id);
  if (followerId === followingId) {
    return NextResponse.json({ error: 'cannot follow yourself' }, { status: 400 });
  }

  const followsCol = await follows();
  const result = await followsCol.updateOne(
    { followerId, followingId },
    { $setOnInsert: { followerId, followingId, createdAt: new Date() } },
    { upsert: true },
  );

  if (result.upsertedCount === 1) {
    const usersCol = await users();
    await Promise.all([
      usersCol.updateOne({ firebaseUid: me.firebaseUid }, { $inc: { followingCount: 1 } }),
      usersCol.updateOne({ firebaseUid: target.firebaseUid }, { $inc: { followerCount: 1 } }),
    ]);
  }

  return NextResponse.json({ following: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const me = await getRequestUser(req);
  if (!me) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const { userId } = await params;
  const target = await loadTarget(userId);
  if (!target) return NextResponse.json({ error: 'user not found' }, { status: 404 });

  const followerId = String(me._id);
  const followingId = String(target._id);

  const followsCol = await follows();
  const result = await followsCol.deleteOne({ followerId, followingId });

  if (result.deletedCount === 1) {
    const usersCol = await users();
    await Promise.all([
      usersCol.updateOne({ firebaseUid: me.firebaseUid }, { $inc: { followingCount: -1 } }),
      usersCol.updateOne({ firebaseUid: target.firebaseUid }, { $inc: { followerCount: -1 } }),
    ]);
  }

  return NextResponse.json({ following: false });
}

export async function GET(req: Request, { params }: Ctx) {
  const me = await getRequestUser(req);
  const { userId } = await params;
  const target = await loadTarget(userId);
  if (!target) return NextResponse.json({ following: false });
  if (!me) return NextResponse.json({ following: false });
  const followsCol = await follows();
  const f = await followsCol.findOne({
    followerId: String(me._id),
    followingId: String(target._id),
  });
  return NextResponse.json({ following: Boolean(f) });
}
