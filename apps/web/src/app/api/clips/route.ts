import { NextResponse } from 'next/server';
import { annotations, users } from '@/lib/mongo';
import { getRequestUser } from '@/lib/auth';
import { pickAvailableSlug } from '@/lib/slugs';
import { normalizeSource } from '@/lib/source';
import { runPageDesignAgent } from '@/lib/agents/page-design';
import { runEnrichmentAgent } from '@/lib/agents/enrich';
import { processVideoAnnotation } from '@/lib/jobs/process-video-annotation';
import { processAudioAnnotation } from '@/lib/jobs/process-audio-annotation';
import { embedAndStoreAnnotation, ANNOTATE_PUBLIC_WORKSPACE } from '@/lib/jobs/embed-annotation';
import { checkDailyLimit } from '@/lib/rate-limit';
import { fetchFeed } from '@/lib/feed';
import type { Annotation, AnnotationType, AnnotationStatus } from '@annotate/shared';
import { DEFAULT_THEME, THEMES } from '@annotate/shared';

interface CreateTextClipBody {
  type: 'text';
  source: { url: string; title?: string; ogImage?: string; author?: string; publishedAt?: string };
  textContent: { selectedText: string; context?: string };
  commentary: { text: string; aiGenerated?: boolean };
}

interface CreateMediaClipBody {
  type: 'video' | 'audio';
  source: { url: string; title?: string; ogImage?: string; author?: string };
  clip: { startTime: number; endTime: number };
  commentary: { text: string; aiGenerated?: boolean };
}

type CreateClipBody = CreateTextClipBody | CreateMediaClipBody;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? '24');
  const before = url.searchParams.get('before') ?? undefined;
  const page = await fetchFeed({ scope: 'public', limit, before });
  return NextResponse.json(page);
}

export async function POST(req: Request) {
  const me = await getRequestUser(req);
  if (!me) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  let body: CreateClipBody;
  try {
    body = (await req.json()) as CreateClipBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  if (body.type !== 'text' && body.type !== 'video' && body.type !== 'audio') {
    return NextResponse.json(
      { error: `type "${(body as { type?: string }).type}" not supported yet` },
      { status: 400 },
    );
  }
  if (!body.source?.url) return NextResponse.json({ error: 'source.url required' }, { status: 400 });
  if (!body.commentary?.text?.trim()) {
    return NextResponse.json({ error: 'commentary.text required' }, { status: 400 });
  }

  if (body.type === 'text') {
    if (!body.textContent?.selectedText?.trim()) {
      return NextResponse.json({ error: 'textContent.selectedText required' }, { status: 400 });
    }
  } else {
    const { startTime, endTime } = body.clip ?? { startTime: -1, endTime: -1 };
    if (typeof startTime !== 'number' || typeof endTime !== 'number' || endTime <= startTime) {
      return NextResponse.json({ error: 'clip.startTime/endTime required' }, { status: 400 });
    }
    if (endTime - startTime > 90) {
      return NextResponse.json({ error: 'clip exceeds 90s max' }, { status: 400 });
    }
  }

  const limit = await checkDailyLimit(String(me._id), body.type);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `daily ${body.type} limit reached (${limit.limit}/day)` },
      { status: 429 },
    );
  }

  const source = normalizeSource(body.source);
  const col = await annotations();
  const slug = await pickAvailableSlug(col, source.title);

  const now = new Date();
  const baseDoc = {
    userId: String(me._id),
    slug,
    type: body.type as AnnotationType,
    workspaceId: ANNOTATE_PUBLIC_WORKSPACE,
    source,
    commentary: {
      text: body.commentary.text.trim(),
      aiGenerated: Boolean(body.commentary.aiGenerated),
      aiEdited: false,
    },
    pageDesign: {
      theme: DEFAULT_THEME,
      accentColor: THEMES[DEFAULT_THEME].accentColor,
      pageTitle: source.title,
      pullQuote: null,
      layoutPriority: [
        { component: 'hero' as const, emphasis: 'high' as const },
        { component: 'clipPlayer' as const, emphasis: 'high' as const },
        { component: 'commentary' as const, emphasis: 'high' as const },
        { component: 'sourceCard' as const, emphasis: 'low' as const },
        { component: 'comments' as const, emphasis: 'low' as const },
      ],
      ogDescription: body.commentary.text.trim().slice(0, 160),
      suggestedTags: [],
      generatedAt: now,
      userOverridden: false,
    },
    stats: { views: 0, comments: 0, shares: 0, votes: 0 },
    createdAt: now,
    updatedAt: now,
  };

  const doc: Annotation =
    body.type === 'text'
      ? {
          ...baseDoc,
          type: 'text',
          status: 'ready' as AnnotationStatus,
          textContent: {
            selectedText: body.textContent.selectedText.trim(),
            context: body.textContent.context?.trim() ?? '',
            wordCount: body.textContent.selectedText.trim().split(/\s+/).filter(Boolean).length,
          },
        }
      : {
          ...baseDoc,
          type: body.type, // 'video' | 'audio'
          status: 'processing' as AnnotationStatus,
        };

  const inserted = await col.insertOne(doc);

  await (await users()).updateOne(
    { firebaseUid: me.firebaseUid },
    { $inc: { annotationCount: 1 }, $set: { updatedAt: now } },
  );

  if (body.type === 'text') {
    // page-design first → embed (so embed text uses the agent's pageTitle);
    // enrichment in parallel.
    void runPageDesignAgent(slug)
      .then(() => embedAndStoreAnnotation(slug))
      .catch((e) => {
        console.error(`[publish] page-design+embed for ${slug}:`, e);
      });
    void runEnrichmentAgent({ slug }).catch((e) => {
      console.error(`[publish] enrichment agent failed for ${slug}:`, e);
    });
  } else if (body.type === 'video') {
    void processVideoAnnotation({
      slug,
      userId: String(me._id),
      sourceUrl: body.source.url,
      startTime: body.clip.startTime,
      endTime: body.clip.endTime,
    }).catch((e) => {
      console.error(`[publish] video pipeline failed for ${slug}:`, e);
    });
  } else {
    void processAudioAnnotation({
      slug,
      userId: String(me._id),
      sourceUrl: body.source.url,
      startTime: body.clip.startTime,
      endTime: body.clip.endTime,
    }).catch((e) => {
      console.error(`[publish] audio pipeline failed for ${slug}:`, e);
    });
  }

  return NextResponse.json(
    { annotation: { ...doc, _id: inserted.insertedId.toString() } },
    { status: 201 },
  );
}
