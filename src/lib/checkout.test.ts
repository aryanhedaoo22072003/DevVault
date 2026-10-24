import { describe, expect, it } from 'vitest';
import { buildOrderPricing, parseCheckoutSlugs, unavailableCheckoutSlugs } from './checkout';

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

  it('prices the original Full-Stack Starter Kit failure from its MongoDB record', () => {
    const result = buildOrderPricing(['full-stack-starter-kit'], [{
      _id: 'mongo-product-id',
      slug: 'full-stack-starter-kit',
      title: 'Full-Stack Starter Kit',
      category: 'Product Engineering',
      priceInr: 6557,
    }]);
    expect(result.amount).toBe(6557);
    expect(result.items[0]).toMatchObject({ productId: 'mongo-product-id', slug: 'full-stack-starter-kit', unitPrice: 6557 });
  });

  it('blocks products without an active private fulfillment asset', () => {
    const products = [{ _id: 'deliverable', slug: 'ready', title: 'Ready', priceInr: 100 }, { _id: 'missing', slug: 'not-ready', title: 'Not Ready', priceInr: 100 }];
    expect(unavailableCheckoutSlugs(products, ['deliverable'])).toEqual(['not-ready']);
  });
});
