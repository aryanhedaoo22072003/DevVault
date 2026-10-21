'use client';

import Link from 'next/link';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { LayoutDashboard, Library, PackageCheck, Search, ShoppingCart } from 'lucide-react';

import { useCart } from '@/components/cart-provider';
import { navItems } from '@/data/catalog';

import { Button } from './ui/button';

export function Navbar() {
  const { itemCount, openCart } = useCart();
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="section-shell flex h-20 items-center justify-between gap-2 md:gap-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 text-sm font-bold text-white shadow-lg shadow-violet-900/30">
            D
          </div>
          <div className="hidden text-lg font-semibold tracking-tight text-white sm:block">
            Dev<span className="text-violet-300">Vault</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/marketplace" className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 sm:flex" aria-label="Browse marketplace">
            <Search className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={openCart}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
            aria-label="Open shopping cart"
          >
            <ShoppingCart className="h-4 w-4" />
            {itemCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-semibold text-white">
                {itemCount}
              </span>
            ) : null}
          </button>
          <Link href="/marketplace">
            <Button variant="secondary" className="hidden lg:inline-flex">
              Browse catalog
            </Button>
          </Link>
          {clerkEnabled ? (
            <>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button type="button" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button type="button" className="inline-flex rounded-full bg-violet-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-500">
                    Sign up
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <UserButton appearance={{ elements: { avatarBox: 'h-10 w-10 ring-2 ring-violet-400/30' } }}>
                  <UserButton.MenuItems>
                    <UserButton.Link label="Dashboard" labelIcon={<LayoutDashboard className="h-4 w-4" />} href="/dashboard" />
                    <UserButton.Link label="My Orders" labelIcon={<PackageCheck className="h-4 w-4" />} href="/dashboard/orders" />
                    <UserButton.Link label="My Purchases" labelIcon={<Library className="h-4 w-4" />} href="/dashboard/purchases" />
                  </UserButton.MenuItems>
                </UserButton>
              </Show>
            </>
          ) : (
            <Link href="/sign-in" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-100">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
