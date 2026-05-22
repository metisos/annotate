import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';
import { runDraftFromInputs } from '@/lib/agents/draft';
import { checkDailyLimit } from '@/lib/rate-limit';

interface DraftPreviewBody {
  source: { url: string; title?: string };
  selectedText: string;
  userContext?: string;
}

export async function POST(req: Request) {
  const me = await getRequestUser(req);
  if (!me) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  let body: DraftPreviewBody;
  try {
    body = (await req.json()) as DraftPreviewBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  if (!body.source?.url) return NextResponse.json({ error: 'source.url required' }, { status: 400 });
  if (!body.selectedText?.trim()) {
    return NextResponse.json({ error: 'selectedText required' }, { status: 400 });
  }

  const limit = await checkDailyLimit(String(me._id), 'aiDraft');
  if (!limit.ok) {
    return NextResponse.json(
      { error: `daily AI draft limit reached (${limit.limit}/day)` },
      { status: 429 },
    );
  }

  let url: URL;
  try {
    url = new URL(body.source.url);
  } catch {
    return NextResponse.json({ error: 'source.url must be a valid URL' }, { status: 400 });
  }

  try {
    const draft = await runDraftFromInputs({
      transcript: body.selectedText.trim(),
      source: {
        title: body.source.title ?? url.hostname,
        url: body.source.url,
        domain: url.hostname.replace(/^www\./, ''),
      },
      clipType: 'text',
      userContext: body.userContext,
    });
    return NextResponse.json({ draft });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'draft failed' },
      { status: 500 },
    );
  }
}
