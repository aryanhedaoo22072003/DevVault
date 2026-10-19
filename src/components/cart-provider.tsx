'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {
  addItemToCart,
  buildCartItem,
  CART_STORAGE_KEY,
  getCartCount,
  getCartSubtotal,
  getCartTotal,
  removeItemFromCart,
  type CartItem,
  type CartProductInput,
} from '@/lib/cart-store';

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  total: number;
  isHydrated: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: CartProductInput) => void;
  removeItem: (slug: string) => void;
  clearCart: () => void;
  removeItems: (slugs: string[]) => void;
  isInCart: (slug: string) => boolean;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadCart = () => {
      try {
        const saved = window.localStorage.getItem(CART_STORAGE_KEY);
        if (!saved) {
          setItems([]);
          setIsHydrated(true);
          return;
        }

        const parsed = JSON.parse(saved) as unknown;
        setItems(Array.isArray(parsed) ? (parsed.filter(Boolean) as CartItem[]) : []);
      } catch {
        setItems([]);
      } finally {
        setIsHydrated(true);
      }
    };

    const id = window.requestAnimationFrame(loadCart);
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, isHydrated]);

  const addItem = (product: CartProductInput) => {
    const nextItem = buildCartItem(product);
    setItems((current) => addItemToCart(current, nextItem));
    setIsOpen(true);
  };

  const removeItem = (slug: string) => {
    setItems((current) => removeItemFromCart(current, slug));
  };

  const clearCart = () => {
    setItems([]);
  };

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: getCartCount(items),
    subtotal: getCartSubtotal(items),
    total: getCartTotal(items),
    isHydrated,
    isOpen,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    addItem,
    removeItem,
    clearCart,
    removeItems: (slugs: string[]) => setItems((current) => current.filter((item) => !slugs.includes(item.slug))),
    isInCart: (slug: string) => items.some((item) => item.slug === slug),
  }), [items, isHydrated, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used inside a CartProvider');
  }

  return context;
}
