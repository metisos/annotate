import type { PageDesign } from './page-design';

export type AnnotationType = 'video' | 'audio' | 'text';
export type AnnotationStatus = 'processing' | 'ready' | 'failed' | 'claimed';

export interface SourceMetadata {
  url: string;
  canonicalUrl: string;
  title: string;
  domain: string;
  ogImage?: string;
  author?: string;
  publishedAt?: Date | string;
}

export interface ClipMetadata {
  startTime: number;
  endTime: number;
  duration: number;
  mediaUrl: string;
  thumbnailUrl?: string;
  resolution: '240p' | '360p';
  twelveLabsVideoId?: string;
  twelveLabsIndexId?: string;
}

export interface TextContent {
  selectedText: string;
  context: string;
  wordCount: number;
}

export interface Commentary {
  text: string;
  audioUrl?: string;
  audioDuration?: number;
  aiGenerated: boolean;
  aiEdited: boolean;
}

export type EnrichmentRelationship = 'supports' | 'contradicts' | 'context';

export interface EnrichmentSource {
  title: string;
  url: string;
  snippet: string;
  relationship: EnrichmentRelationship;
}

export interface Enrichment {
  sources: EnrichmentSource[];
  summary?: string;
  generatedAt: Date | string;
}

export interface AnnotationStats {
  views: number;
  comments: number;
  shares: number;
}

export interface AnnotationClaim {
  filed: boolean;
  filedAt?: Date | string;
  claimantEmail?: string;
  reason?: string;
  status?: 'pending' | 'reviewed' | 'dismissed' | 'removed';
}

export interface Annotation {
  _id?: string;
  userId: string;
  slug: string;
  type: AnnotationType;
  status: AnnotationStatus;
  source: SourceMetadata;
  clip?: ClipMetadata;
  textContent?: TextContent;
  commentary: Commentary;
  enrichment?: Enrichment;
  pageDesign?: PageDesign;
  stats: AnnotationStats;
  claim?: AnnotationClaim;

  /** USC v1 workspace partition. Defaults to 'annotate-public' for single-tenant. */
  workspaceId?: string;

  /** USC v1 semantic embedding (L2-normalized 768d, Vertex text-embedding-005).
   *  Populated by the embed job at publish; lazily backfilled. */
  uscEmbedding?: number[] | null;

  createdAt: Date | string;
  updatedAt: Date | string;
}
