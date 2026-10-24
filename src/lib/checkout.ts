export type CheckoutProduct = { _id?: unknown; slug: string; title: string; category?: string; imageUrl?: string; priceInr: number };

export function unavailableCheckoutSlugs(products: CheckoutProduct[], fulfillableProductIds: Iterable<string>) {
  const fulfillable = new Set(fulfillableProductIds);
  return products.filter((product) => !fulfillable.has(String(product._id))).map((product) => product.slug);
}

export function parseCheckoutSlugs(payload: unknown) {
  if (!payload || typeof payload !== 'object') return [];
  const items = (payload as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  return [...new Set(items.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const slug = (item as { slug?: unknown }).slug;
    return typeof slug === 'string' && slug.trim() ? [slug.trim()] : [];
  }))];
}

export function buildOrderPricing(slugs: string[], products: CheckoutProduct[]) {
  const bySlug = new Map(products.map((product) => [String(product.slug), product]));
  const items = slugs.map((slug) => {
    const product = bySlug.get(slug);
    if (!product) throw new Error(`Product not available: ${slug}`);
    const unitPrice = Number(product.priceInr);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error(`Invalid price for ${product.title}`);
    return { productId: String(product._id ?? slug), slug, title: product.title, category: product.category || 'General', image: product.imageUrl || '', unitPrice, quantity: 1, subtotal: unitPrice };
  });
  const amount = items.reduce((total, item) => total + item.subtotal, 0);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Order total must be greater than zero.');
  return { items, amount };
}
