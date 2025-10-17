import { NextRequest, NextResponse } from 'next/server';

import {
  getAuthUserFromRequest,
  hasPermission,
} from '@/lib/auth';

type OptimizePayload = {
  url: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
};

export async function POST(request: NextRequest) {
  const user = getAuthUserFromRequest(request);
  if (!user || !hasPermission(user, 'media:*')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payload = (await request.json()) as OptimizePayload;

  if (!payload?.url) {
    return NextResponse.json({ error: 'Source URL is required' }, { status: 400 });
  }

  const optimizedUrl = new URL(payload.url);
  optimizedUrl.searchParams.set('w', String(payload.width ?? 'auto'));
  optimizedUrl.searchParams.set('h', String(payload.height ?? 'auto'));
  optimizedUrl.searchParams.set('q', String(payload.quality ?? 80));
  if (payload.format) {
    optimizedUrl.searchParams.set('fmt', payload.format);
  }

  return NextResponse.json(
    {
      originalUrl: payload.url,
      optimizedUrl: optimizedUrl.toString(),
      requestedBy: user.id,
    },
    { status: 200 },
  );
}
