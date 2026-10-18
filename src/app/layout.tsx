import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { CartDrawer } from '@/components/cart-drawer';
import { CartProvider } from '@/components/cart-provider';
import { hasClerkConfig } from '@/lib/env';

import './globals.css';

export const metadata: Metadata = {
  title: 'DevVault | Premium developer products and learning',
  description:
    'A premium marketplace for digital products, coding practice, learning pathways, and AI-powered developer workflows.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const wrappedContent = hasClerkConfig ? <ClerkProvider>{children}</ClerkProvider> : children;

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <CartProvider>
          <CartDrawer />
          {wrappedContent}
        </CartProvider>
      </body>
    </html>
  );
}
