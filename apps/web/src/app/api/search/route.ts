import { NextResponse } from 'next/server';
import { searchAnnotations } from '@/lib/search';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  const limit = Number(url.searchParams.get('limit') ?? '24');
  const before = url.searchParams.get('before') ?? undefined;
  const result = await searchAnnotations({ q, limit, before });
  return NextResponse.json(result);
}
