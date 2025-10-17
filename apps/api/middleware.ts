import { NextRequest, NextResponse } from 'next/server';

import { isRateLimited, rateLimitBuckets } from './lib/redis';

const CACHE_HEADERS = {
  'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
  'CDN-Cache-Control': 'max-age=3600',
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  const apiKey = request.headers.get('x-api-key');

  const bucketName = apiKey
    ? 'api_key'
    : authHeader?.startsWith('Bearer ')
    ? 'authenticated'
    : 'anonymous';
  const bucket = rateLimitBuckets[bucketName];

  const identityRoot =
    apiKey ??
    authHeader ??
    request.headers.get('x-forwarded-for') ??
    request.ip ??
    'anonymous';

  const rateKey = `rate:${bucketName}:${identityRoot}`;
  const limited = await isRateLimited(rateKey, bucket);

  if (limited) {
    return NextResponse.json(
      { error: 'Too Many Requests', retryAfter: bucket.windowSeconds },
      {
        status: 429,
        headers: { 'Retry-After': bucket.windowSeconds.toString() },
      },
    );
  }

  const response = NextResponse.next();
  Object.entries(CACHE_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
