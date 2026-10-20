import { beforeEach, describe, expect, it, vi } from 'vitest';

const syncUserProfile = vi.fn();
const reconcileCheckoutSession = vi.fn();
vi.mock('@/lib/auth', () => ({ syncUserProfile }));
vi.mock('@/lib/order-payment', () => ({ reconcileCheckoutSession }));

describe('POST /api/payments/stripe/reconcile', () => {
  beforeEach(() => {
    syncUserProfile.mockReset();
    reconcileCheckoutSession.mockReset();
  });

  it('requires Clerk authentication', async () => {
    syncUserProfile.mockResolvedValue(null);
    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/payments/stripe/reconcile', { method: 'POST', body: '{}' }));
    expect(response.status).toBe(401);
    expect(reconcileCheckoutSession).not.toHaveBeenCalled();
  });

  it('rejects non-test Checkout Session IDs', async () => {
    syncUserProfile.mockResolvedValue({ userId: 'user_123' });
    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/payments/stripe/reconcile', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'cs_live_forbidden' }),
    }));
    expect(response.status).toBe(400);
    expect(reconcileCheckoutSession).not.toHaveBeenCalled();
  });
});
