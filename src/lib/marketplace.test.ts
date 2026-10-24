import { describe, expect, it } from 'vitest';
import { productAvailability } from './marketplace';

describe('marketplace product availability', () => {
  it('allows a paid product only when a private delivery asset is active', () => {
    expect(productAvailability(6557, 1)).toEqual({ priceType: 'paid', isPurchasable: true, availabilityLabel: 'Available now' });
    expect(productAvailability(6557, 0)).toEqual({ priceType: 'paid', isPurchasable: false, availabilityLabel: 'Not yet available' });
  });

  it('does not route free products into paid Stripe checkout', () => {
    expect(productAvailability(0, 1)).toEqual({ priceType: 'free', isPurchasable: false, availabilityLabel: 'Free access not configured' });
  });
});
