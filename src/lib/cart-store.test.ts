import { describe, expect, it } from 'vitest';

import { removeItemsFromCart, type CartItem } from './cart-store';

function cartItem(slug: string): CartItem {
  return { id: slug, slug, title: slug, category: 'Test', image: '', priceInr: 100, currency: 'INR', addedAt: '2026-10-20T00:00:00.000Z' };
}

describe('paid cart cleanup', () => {
  it('removes only purchased products and is idempotent', () => {
    const cart = [cartItem('full-stack-starter-kit'), cartItem('keep-me')];
    const once = removeItemsFromCart(cart, ['full-stack-starter-kit']);
    const twice = removeItemsFromCart(once, ['full-stack-starter-kit']);
    expect(once.map((item) => item.slug)).toEqual(['keep-me']);
    expect(twice).toEqual(once);
  });
});
