import type { Annotation, User } from '@annotate/shared';
import type { UscPrimitive, UscProvenance } from './types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

export function sourceTypeForAnnotation(type: Annotation['type']): string {
  return type === 'video'
    ? 'annotation_video'
    : type === 'audio'
      ? 'annotation_audio'
      : 'annotation_text';
}

function temporalFor(ann: Annotation): { t: string; σt: number } {
  if (ann.clip) {
    const sourceMs = ann.source.publishedAt
      ? new Date(ann.source.publishedAt as string).getTime()
      : new Date(ann.createdAt as string).getTime();
    const startMs = sourceMs + ann.clip.startTime * 1000;
    return { t: new Date(startMs).toISOString(), σt: Math.max(1, ann.clip.duration) };
  }
  const t = ann.source.publishedAt
    ? new Date(ann.source.publishedAt as string)
    : new Date(ann.createdAt as string);
  return { t: t.toISOString(), σt: 86400 };
}

export function annotationToUscPrimitive(input: {
  annotation: Annotation;
  author?: Pick<User, 'handle' | 'displayName'>;
}): UscPrimitive {
  const ann = input.annotation;
  const provenance: UscProvenance = {
    source_type: sourceTypeForAnnotation(ann.type),
    source_uri: `${APP_URL}/clip/${ann.slug}`,
    derivation_chain: [
      {
        primitive_identifier: ann.source.canonicalUrl,
        relation: 'cites',
      },
    ],
    fidelity: ann.commentary.aiGenerated && !ann.commentary.aiEdited ? 'medium' : 'high',
    captured_at:
      ann.createdAt instanceof Date
        ? ann.createdAt.toISOString()
        : new Date(ann.createdAt as string).toISOString(),
    captured_by: input.author?.handle ?? ann.userId,
  };

  return {
    identifier: `annotate:${String(ann._id ?? ann.slug)}`,
    uri: `ctx://annotate-public/annotation/${ann.slug}`,
    workspace_id: ann.workspaceId ?? 'annotate-public',
    spatial: null,
    temporal: temporalFor(ann),
    provenance,
    tier: 'cognitive',
    embedding: ann.uscEmbedding ?? null,
    payload: {
      slug: ann.slug,
      type: ann.type,
      theme: ann.pageDesign?.theme,
      pageTitle: ann.pageDesign?.pageTitle ?? ann.source.title,
      pullQuote: ann.pageDesign?.pullQuote ?? null,
      commentary: ann.commentary.text,
      mediaUrl: ann.clip?.mediaUrl ?? null,
      thumbnailUrl: ann.clip?.thumbnailUrl ?? null,
      source: {
        url: ann.source.url,
        title: ann.source.title,
        domain: ann.source.domain,
      },
      author: input.author
        ? { handle: input.author.handle, displayName: input.author.displayName }
        : undefined,
      tags: ann.pageDesign?.suggestedTags ?? [],
      stats: ann.stats,
    },
  };
}
