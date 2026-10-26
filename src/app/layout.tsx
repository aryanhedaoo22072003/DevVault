import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { CartDrawer } from '@/components/cart-drawer';
import { CartProvider } from '@/components/cart-provider';
import { VioletEclipseBackground } from '@/components/violet-eclipse-background';
import { hasClerkConfig } from '@/lib/env';

import './globals.css';

export const metadata: Metadata = {
  applicationName: 'DevVault',
  title: 'DevVault | Premium developer products and learning',
  description:
    'A premium marketplace for digital products, coding practice, learning pathways, and AI-powered developer workflows.',
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png', sizes: '512x512' }],
    apple: [{ url: '/apple-icon.png', type: 'image/png', sizes: '180x180' }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const wrappedContent = hasClerkConfig ? <ClerkProvider afterSignOutUrl="/" appearance={{ variables: { colorPrimary: 'var(--brand)', colorBackground: 'var(--surface)', colorForeground: 'var(--foreground)', borderRadius: '0.875rem' } }}>{children}</ClerkProvider> : children;

  return (
    <html lang="en" suppressHydrationWarning data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('devvault-theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){}})()` }} />
      </head>
      <body>
        <VioletEclipseBackground />
        <CartProvider>
          <CartDrawer />
          {wrappedContent}
        </CartProvider>
      </body>
    </html>
  );
}
