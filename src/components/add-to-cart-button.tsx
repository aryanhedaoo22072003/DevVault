'use client';

import { ShoppingBag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCart } from '@/components/cart-provider';
import type { CartProductInput } from '@/lib/cart-store';

export function AddToCartButton({
  product,
  className,
  size = 'default',
  variant = 'default',
}: {
  product: CartProductInput;
  className?: string;
  size?: 'default' | 'sm';
  variant?: 'default' | 'secondary';
}) {
  const { addItem, isInCart } = useCart();
  const alreadyInCart = isInCart(product.slug);

  return (
    <Button
      type="button"
      variant={alreadyInCart ? 'secondary' : variant}
      size={size}
      className={className}
      onClick={() => addItem(product)}
      disabled={alreadyInCart}
      aria-label={alreadyInCart ? `${product.title} already in cart` : `Add ${product.title} to cart`}
    >
      <ShoppingBag className="h-4 w-4" />
      {alreadyInCart ? 'Added to cart' : 'Add to cart'}
    </Button>
  );
}
