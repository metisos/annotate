import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';
import { suggestMoments } from '@/lib/agents/suggest';
import { checkDailyLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const me = await getRequestUser(req);
  if (!me) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const { youtubeUrl } = (await req.json()) as { youtubeUrl?: string };
  if (!youtubeUrl) return NextResponse.json({ error: 'youtubeUrl required' }, { status: 400 });

  let url: URL;
  try {
    url = new URL(youtubeUrl);
  } catch {
    return NextResponse.json({ error: 'youtubeUrl must be a valid URL' }, { status: 400 });
  }
  if (!url.hostname.endsWith('youtube.com') && !url.hostname.endsWith('youtu.be')) {
    return NextResponse.json({ error: 'only YouTube URLs are supported' }, { status: 400 });
  }

  const limit = await checkDailyLimit(String(me._id), 'suggest');
  if (!limit.ok) {
    return NextResponse.json(
      { error: `daily suggestion limit reached (${limit.limit}/day)` },
      { status: 429 },
    );
  }

  try {
    const moments = await suggestMoments({ youtubeUrl: url.toString() });
    return NextResponse.json({ moments });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'suggest failed' },
      { status: 500 },
    );
  }
}
