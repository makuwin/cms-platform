import { NextRequest, NextResponse } from 'next/server';

import { isRateLimited, rateLimitBuckets } from './lib/redis';

const CACHE_HEADERS = {
  'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
  'CDN-Cache-Control': 'max-age=3600',
};

const ALLOWED_ORIGINS = (
  process.env.CORS_ALLOWED_ORIGINS ??
  'http://localhost:4321'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function resolveOrigin(requestOrigin: string | null) {
  if (!requestOrigin) return null;
  if (ALLOWED_ORIGINS.includes('*')) return requestOrigin;
  return ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : null;
}

function applyCorsHeaders(response: NextResponse, origin: string | null) {
  if (!origin) return response;
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Vary', 'Origin');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-API-Key',
  );
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  );
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const requestOrigin = resolveOrigin(request.headers.get('origin'));

  if (request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 });
    applyCorsHeaders(preflight, requestOrigin);
    return preflight;
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
    const limitedResponse = NextResponse.json(
      { error: 'Too Many Requests', retryAfter: bucket.windowSeconds },
      {
        status: 429,
        headers: { 'Retry-After': bucket.windowSeconds.toString() },
      },
    );
    applyCorsHeaders(limitedResponse, requestOrigin);
    return limitedResponse;
  }

  const response = NextResponse.next();
  Object.entries(CACHE_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  applyCorsHeaders(response, requestOrigin);
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
