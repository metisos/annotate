import { NextResponse } from 'next/server';
import { EMBEDDING_DIM, EMBEDDING_MODEL } from '@/lib/embed';
import type { UscPlatformInfo } from '@/lib/usc/types';

// Public discovery endpoint per USC v1.0.0 §6.4. No auth required.
export async function GET() {
  const info: UscPlatformInfo = {
    platform: 'annotate',
    protocol_version: '1.0.0',
    conformance_level: 'L1',
    tiers: ['cognitive'],
    source_types: {
      cognitive: ['annotation_text', 'annotation_video', 'annotation_audio'],
      temporal: [],
      spatial: [],
      agent: [],
    },
    embeddings: {
      model_id: `vertex/${EMBEDDING_MODEL}`,
      dimensions: EMBEDDING_DIM,
      tiers: ['cognitive'],
    },
    supports_projection: false,
    spatial: { supported: false, declared_frames: [] },
  };
  return NextResponse.json(info, {
    headers: {
      'cache-control': 'public, max-age=300, s-maxage=300',
    },
  });
}
