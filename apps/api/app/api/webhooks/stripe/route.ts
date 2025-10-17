import { NextRequest, NextResponse } from 'next/server';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  const payload = await request.text();

  if (!STRIPE_WEBHOOK_SECRET) {
    console.warn('Stripe webhook secret is not configured.');
  }

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing Stripe signature header' },
      { status: 400 },
    );
  }

  // TODO: Verify signature using Stripe library when available.
  let eventData: unknown;
  try {
    eventData = JSON.parse(payload);
  } catch {
    eventData = payload;
  }

  console.info('[stripe:webhook] Received event', {
    signature,
    event: eventData,
  });

  // Enqueue downstream processing, update subscriptions, etc.

  return NextResponse.json({ received: true }, { status: 200 });
}
