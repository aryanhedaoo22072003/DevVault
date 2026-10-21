import { describe, expect, it } from 'vitest';

import { allItemsProvisioned, buildEntitlementIdentity, buildPaidEntitlementOrderFilter, buildPrivateAssetFilter, entitlementState } from './entitlements';

describe('entitlement provisioning rules', () => {
  it('keeps products with missing or unpublished assets awaiting fulfillment', () => {
    expect(entitlementState(0)).toBe('awaiting_assets');
  });

  it('makes products available only when an approved private asset exists', () => {
    expect(entitlementState(1)).toBe('available');
  });

  it('requires every product in a multi-product order before fulfillment', () => {
    expect(allItemsProvisioned(['one', 'two'], ['one'])).toBe(false);
    expect(allItemsProvisioned(['one', 'two'], ['one', 'two'])).toBe(true);
  });

  it('is stable for repeated provisioning inputs', () => {
    expect(buildEntitlementIdentity('user', 'order', 'product')).toEqual(buildEntitlementIdentity('user', 'order', 'product'));
  });

  it('binds authorization to the owner and a paid order', () => {
    expect(buildPaidEntitlementOrderFilter('user_owner', 'order', 'product')).toEqual({
      _id: 'order',
      userId: 'user_owner',
      clerkUserId: 'user_owner',
      paymentStatus: 'paid',
      'items.productId': 'product',
    });
  });

  it('requires active, unpublished private assets with a storage key', () => {
    expect(buildPrivateAssetFilter('asset')).toEqual({
      _id: 'asset',
      isPublic: false,
      isActive: true,
      storageKey: { $nin: ['', null] },
    });
  });
});
