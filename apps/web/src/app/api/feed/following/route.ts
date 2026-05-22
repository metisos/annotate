import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';
import { fetchFeed } from '@/lib/feed';

export async function GET(req: Request) {
  const me = await getRequestUser(req);
  if (!me) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? '24');
  const before = url.searchParams.get('before') ?? undefined;

  const page = await fetchFeed({
    scope: 'following',
    viewerId: String(me._id),
    limit,
    before,
  });
  return NextResponse.json(page);
}
