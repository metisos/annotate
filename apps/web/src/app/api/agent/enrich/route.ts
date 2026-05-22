import { NextResponse } from 'next/server';
import { runEnrichmentAgent } from '@/lib/agents/enrich';

export async function POST(req: Request) {
  const { slug } = (await req.json()) as { slug?: string };
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });
  try {
    const enrichment = await runEnrichmentAgent({ slug });
    return NextResponse.json({ enrichment });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'enrichment failed' },
      { status: 500 },
    );
  }
}
