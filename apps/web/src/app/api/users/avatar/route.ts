import { NextResponse } from 'next/server';
import { users } from '@/lib/mongo';
import { getRequestUser } from '@/lib/auth';
import { uploadAvatar } from '@/lib/storage';

const MAX_BYTES = 2 * 1024 * 1024; // 2MB after client crop
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(req: Request) {
  const me = await getRequestUser(req);
  if (!me) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const ct = req.headers.get('content-type') ?? '';
  if (!ct.startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'multipart/form-data required' }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'file field required' }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: `unsupported content-type ${file.type}` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `file too large (${MAX_BYTES} bytes max)` }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadAvatar({
    userId: String(me._id),
    data: buf,
    contentType: file.type,
  });

  const col = await users();
  await col.updateOne(
    { firebaseUid: me.firebaseUid },
    { $set: { avatarUrl: uploaded.publicUrl, updatedAt: new Date() } },
  );

  return NextResponse.json({ avatarUrl: uploaded.publicUrl });
}
