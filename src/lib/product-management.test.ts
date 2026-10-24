import { describe, expect, it } from 'vitest';
import { canDeactivateDeliveryAsset, fulfillmentReadiness, publicationUpdate } from './product-management';
describe('owner product lifecycle', () => {
  it('maps explicit draft and published transitions without changing identity', () => {
    expect(publicationUpdate('draft')).toEqual({ status: 'draft', isPublished: false });
    expect(publicationUpdate('published')).toEqual({ status: 'published', isPublished: true });
  });
  it('requires a real active private file for fulfillment and separates previews', () => {
    expect(fulfillmentReadiness([{ isPublic: true, isActive: true, storageKey: 'sample.pdf', fileExists: true }])).toEqual({ fulfillable: false, deliveryCount: 0, previewCount: 1 });
    expect(fulfillmentReadiness([{ isPublic: false, isActive: true, storageKey: 'paid.zip', fileExists: false }]).fulfillable).toBe(false);
    expect(fulfillmentReadiness([{ isPublic: false, isActive: true, storageKey: 'paid.zip', fileExists: true }]).fulfillable).toBe(true);
  });
  it('preserves paid access when deactivating or replacing delivery assets', () => {
    expect(canDeactivateDeliveryAsset({ isPublic: false, hasPaidOrders: true, otherActiveDeliveryAssets: 0 })).toBe(false);
    expect(canDeactivateDeliveryAsset({ isPublic: false, hasPaidOrders: true, otherActiveDeliveryAssets: 1 })).toBe(true);
    expect(canDeactivateDeliveryAsset({ isPublic: true, hasPaidOrders: true, otherActiveDeliveryAssets: 0 })).toBe(true);
  });
});
