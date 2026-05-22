import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';
import { runDraftAgent } from '@/lib/agents/draft';
import { checkDailyLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const me = await getRequestUser(req);
  if (!me) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const { slug, userContext } = (await req.json()) as { slug?: string; userContext?: string };
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  const limit = await checkDailyLimit(String(me._id), 'aiDraft');
  if (!limit.ok) {
    return NextResponse.json(
      { error: `daily AI draft limit reached (${limit.limit}/day)` },
      { status: 429 },
    );
  }

  try {
    const draft = await runDraftAgent({ slug, userContext });
    return NextResponse.json({ draft });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'draft failed' },
      { status: 500 },
    );
  }
}
