export type PublicationState = 'draft' | 'published';
export function publicationUpdate(status: PublicationState) {
  return { status, isPublished: status === 'published' } as const;
}
export function fulfillmentReadiness(assets: Array<{ isPublic: boolean; isActive: boolean; storageKey?: string; fileExists: boolean }>) {
  const delivery = assets.filter((asset) => !asset.isPublic && asset.isActive && Boolean(asset.storageKey) && asset.fileExists);
  const previews = assets.filter((asset) => asset.isPublic && asset.isActive && Boolean(asset.storageKey) && asset.fileExists);
  return { fulfillable: delivery.length > 0, deliveryCount: delivery.length, previewCount: previews.length };
}
export function canDeactivateDeliveryAsset(input: { isPublic: boolean; hasPaidOrders: boolean; otherActiveDeliveryAssets: number }) {
  return input.isPublic || !input.hasPaidOrders || input.otherActiveDeliveryAssets > 0;
}
