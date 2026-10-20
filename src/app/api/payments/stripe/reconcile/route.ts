import { NextResponse } from 'next/server';

import { syncUserProfile } from '@/lib/auth';
import { reconcileCheckoutSession } from '@/lib/order-payment';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await syncUserProfile();
  if (!session?.userId) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });

  let stripeSessionId = '';
  try {
    const payload = await request.json() as { sessionId?: unknown };
    stripeSessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : '';
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid reconciliation payload.' }, { status: 400 });
  }
  if (!stripeSessionId.startsWith('cs_test_')) {
    return NextResponse.json({ success: false, error: 'A Stripe test Checkout Session ID is required.' }, { status: 400 });
  }

  try {
    const result = await reconcileCheckoutSession(stripeSessionId, session.userId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reconcile Stripe Checkout.';
    const notFound = message.includes('not found for this account');
    return NextResponse.json({ success: false, error: message }, { status: notFound ? 404 : 400 });
  }
}
