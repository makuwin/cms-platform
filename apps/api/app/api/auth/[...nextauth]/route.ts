import { NextRequest } from 'next/server';

const message =
  'NextAuth handler is not configured. Add your NextAuth configuration here.';

export async function GET() {
  return new Response(
    JSON.stringify({ error: 'Not Implemented', message }),
    {
      status: 501,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

export async function POST(request: NextRequest) {
  return GET(request);
}
