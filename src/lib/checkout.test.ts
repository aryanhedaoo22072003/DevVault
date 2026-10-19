import { describe, expect, it } from 'vitest';
import { buildOrderPricing, parseCheckoutSlugs } from './checkout';

describe('checkout pricing', () => {
  it('uses MongoDB snapshots and ignores client prices and duplicate slugs', () => {
    const slugs = parseCheckoutSlugs({ items: [{ slug: 'kit', priceInr: 1 }, { slug: 'kit' }, { slug: 'course' }] });
    const result = buildOrderPricing(slugs, [
      { _id: 'db1', slug: 'kit', title: 'Server Kit', category: 'Templates', priceInr: 499 },
      { _id: 'db2', slug: 'course', title: 'Server Course', priceInr: 1000 },
    ]);
    expect(result.amount).toBe(1499);
    expect(result.items).toMatchObject([{ title: 'Server Kit', unitPrice: 499 }, { title: 'Server Course', unitPrice: 1000 }]);
  });

  it('rejects missing and invalid server products', () => {
    expect(() => buildOrderPricing(['missing'], [])).toThrow('Product not available');
    expect(() => buildOrderPricing(['free'], [{ slug: 'free', title: 'Bad', priceInr: 0 }])).toThrow('Invalid price');
  });
});
