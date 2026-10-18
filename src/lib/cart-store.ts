export type CartItem = {
  id: string;
  slug: string;
  title: string;
  category: string;
  image: string;
  priceInr: number;
  currency: 'INR';
  addedAt: string;
};

export type CartProductInput = {
  id?: string;
  slug: string;
  title: string;
  category?: string;
  image?: string;
  price?: string | number;
  priceInr?: number;
};

export const CART_STORAGE_KEY = 'devvault-cart-v1';
const INR_MULTIPLIER = 83;

export function formatInr(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));
}

export function parsePriceToInr(price: string | number | undefined) {
  if (typeof price === 'number' && Number.isFinite(price)) {
    return Math.round(price);
  }

  if (typeof price !== 'string') {
    return 0;
  }

  const normalized = price.trim();
  if (!normalized) {
    return 0;
  }

  const numericMatch = normalized.match(/\d+(?:\.\d+)?/);
  if (!numericMatch) {
    return 0;
  }

  const amount = Number(numericMatch[0]);
  if (Number.isNaN(amount)) {
    return 0;
  }

  if (normalized.includes('$')) {
    return Math.round(amount * INR_MULTIPLIER);
  }

  if (normalized.includes('₹')) {
    return Math.round(amount);
  }

  return Math.round(amount);
}

export function buildCartItem(product: CartProductInput): CartItem {
  const priceInr = typeof product.priceInr === 'number'
    ? Math.round(product.priceInr)
    : parsePriceToInr(product.price);

  return {
    id: product.id ?? product.slug,
    slug: product.slug,
    title: product.title,
    category: product.category ?? 'General',
    image: product.image ?? 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
    priceInr,
    currency: 'INR',
    addedAt: new Date().toISOString(),
  };
}

export function addItemToCart(items: CartItem[], item: CartItem) {
  const exists = items.some((existing) => existing.slug === item.slug);
  if (exists) {
    return items;
  }

  return [...items, item];
}

export function removeItemFromCart(items: CartItem[], slug: string) {
  return items.filter((item) => item.slug !== slug);
}

export function getCartSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.priceInr, 0);
}

export function getCartCount(items: CartItem[]) {
  return items.length;
}

export function getCartTotal(items: CartItem[]) {
  return getCartSubtotal(items);
}

export function isCartItemUnavailable(item: CartItem | null | undefined) {
  return !item || !item.slug || item.priceInr <= 0;
}
