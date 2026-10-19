import { beforeEach, describe, expect, it, vi } from 'vitest';

const syncUserProfile = vi.fn();
vi.mock('@/lib/auth', () => ({ syncUserProfile }));
vi.mock('@/lib/db', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/order.model', () => ({ OrderModel: { create: vi.fn(), updateOne: vi.fn() } }));
vi.mock('@/models/product.model', () => ({ ProductModel: { find: vi.fn() } }));
vi.mock('@/lib/stripe', () => ({ getStripeClient: vi.fn(), getStripeTestConfig: vi.fn() }));

describe('POST /api/checkout authorization', () => {
  beforeEach(() => syncUserProfile.mockReset());

  it('rejects unauthenticated checkout before processing the cart', async () => {
    syncUserProfile.mockResolvedValue(null);
    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/checkout', { method: 'POST', body: '{}' }));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ success: false, error: 'Authentication required.' });
  });
});
