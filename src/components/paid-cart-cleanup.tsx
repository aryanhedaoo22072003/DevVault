'use client';

import { useEffect, useRef } from 'react';
import { useCart } from '@/components/cart-provider';

export function PaidCartCleanup({ slugs }: { slugs: string[] }) {
  const { removeItems } = useCart();
  const hasCleaned = useRef(false);
  useEffect(() => {
    if (hasCleaned.current) return;
    hasCleaned.current = true;
    removeItems(slugs);
  }, [removeItems, slugs]);
  return null;
}
