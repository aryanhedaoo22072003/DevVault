import { beforeEach, describe, expect, it, vi } from 'vitest';

const syncUserProfile = vi.fn();
const findProducts = vi.fn();
const getStripeTestConfig = vi.fn();
vi.mock('@/lib/auth', () => ({ syncUserProfile }));
vi.mock('@/lib/db', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/order.model', () => ({ OrderModel: { create: vi.fn(), updateOne: vi.fn() } }));
vi.mock('@/models/product.model', () => ({ ProductModel: { find: findProducts } }));
vi.mock('@/lib/stripe', () => ({ getStripeClient: vi.fn(), getStripeTestConfig }));

describe('POST /api/checkout authorization', () => {
  beforeEach(() => {
    syncUserProfile.mockReset();
    findProducts.mockReset();
    getStripeTestConfig.mockReset();
  });

  it('rejects unauthenticated checkout before processing the cart', async () => {
    syncUserProfile.mockResolvedValue(null);
    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/checkout', { method: 'POST', body: '{}' }));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ success: false, error: 'Authentication required.' });
  });

  it('queries by slug and requires a published, available MongoDB product', async () => {
    syncUserProfile.mockResolvedValue({
      userId: 'user_test',
      profile: { email: 'buyer@example.com' },
      user: { emailAddresses: [{ emailAddress: 'buyer@example.com' }], fullName: 'Buyer' },
    });
    findProducts.mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ items: [{ slug: 'full-stack-starter-kit', priceInr: 1 }] }),
    }));
    expect(findProducts).toHaveBeenCalledWith({
      slug: { $in: ['full-stack-starter-kit'] },
      isPublished: true,
      status: 'published',
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'Product not available: full-stack-starter-kit' });
  });
});
