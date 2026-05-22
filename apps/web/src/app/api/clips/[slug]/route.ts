import { NextResponse } from 'next/server';
import { annotations } from '@/lib/mongo';
import { getRequestUser } from '@/lib/auth';

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const col = await annotations();
  const doc = await col.findOne({ slug });
  if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ annotation: doc });
}

export async function PUT(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const me = await getRequestUser(req);
  if (!me) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const col = await annotations();
  const existing = await col.findOne({ slug });
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (existing.userId !== String(me._id)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const body = (await req.json()) as { commentary?: { text: string } };
  if (!body.commentary?.text?.trim()) {
    return NextResponse.json({ error: 'commentary.text required' }, { status: 400 });
  }

  const now = new Date();
  await col.updateOne(
    { slug },
    {
      $set: {
        'commentary.text': body.commentary.text.trim(),
        'commentary.aiEdited': existing.commentary.aiGenerated ? true : existing.commentary.aiEdited,
        updatedAt: now,
      },
    },
  );

  const updated = await col.findOne({ slug });
  return NextResponse.json({ annotation: updated });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const me = await getRequestUser(req);
  if (!me) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const col = await annotations();
  const existing = await col.findOne({ slug });
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (existing.userId !== String(me._id)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  await col.deleteOne({ slug });
  return NextResponse.json({ ok: true });
}
