import { NextResponse } from 'next/server';
import { runPageDesignAgent } from '@/lib/agents/page-design';

export async function POST(req: Request) {
  const { slug } = (await req.json()) as { slug?: string };
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });
  try {
    const pageDesign = await runPageDesignAgent(slug);
    return NextResponse.json({ pageDesign });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'agent failed' },
      { status: 500 },
    );
  }
}
