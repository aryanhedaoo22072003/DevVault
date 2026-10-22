'use client';

import Link from 'next/link';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { GraduationCap, LayoutDashboard, Library, PackageCheck, Search, ShoppingCart } from 'lucide-react';

import { useCart } from '@/components/cart-provider';
import { navItems } from '@/data/catalog';

import { Button } from './ui/button';
import { ThemeToggle } from './theme-toggle';

export function Navbar() {
  const { itemCount, openCart } = useCart();
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <header className="relative sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-2xl">
      <div className="section-shell flex h-[4.5rem] min-w-0 items-center justify-between gap-2 md:gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 text-sm font-bold text-white shadow-lg shadow-cyan-950/30">
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.45),transparent_35%)]" />
            <span className="relative">D</span>
          </div>
          <div className="hidden text-lg font-semibold tracking-tight text-white sm:block">
            Dev<span className="text-cyan-400">Vault</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] p-1 text-sm text-slate-300 md:flex">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} className="rounded-full px-3 py-2 transition hover:bg-white/[0.06] hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden min-w-0 shrink-0 items-center gap-1.5 md:flex sm:gap-3">
          <Link href="/marketplace" className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-400/30 hover:bg-white/10 sm:flex" aria-label="Browse marketplace">
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
          <ThemeToggle compact />
          <Link href="/marketplace" className="hidden lg:block">
            <Button variant="secondary" className="hidden lg:inline-flex">
              Browse catalog
            </Button>
          </Link>
          {clerkEnabled ? (
            <>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button type="button" className="rounded-full border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-medium text-slate-100 transition hover:bg-white/10 sm:px-3 sm:text-sm">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button type="button" className="hidden rounded-full bg-violet-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-500 sm:inline-flex">
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
                    <UserButton.Link label="My Learning" labelIcon={<GraduationCap className="h-4 w-4" />} href="/dashboard/learning" />
                  </UserButton.MenuItems>
                </UserButton>
              </Show>
            </>
          ) : (
            <Link href="/sign-in" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-100">Sign in</Link>
          )}
        </div>
      </div>
      <nav className="section-shell flex gap-1 overflow-x-auto border-t border-white/5 py-2 text-xs text-slate-300 md:hidden" aria-label="Mobile navigation">
        {navItems.map((item) => <Link key={item.label} href={item.href} className="shrink-0 rounded-full px-3 py-1.5 transition hover:bg-white/[0.06] hover:text-white">{item.label}</Link>)}
        <button type="button" onClick={openCart} className="shrink-0 rounded-full px-3 py-1.5">Cart{itemCount ? ` (${itemCount})` : ''}</button>
        <ThemeToggle compact />
        {clerkEnabled ? <><Show when="signed-out"><Link href="/sign-in" className="shrink-0 rounded-full px-3 py-1.5">Sign in</Link></Show><Show when="signed-in"><UserButton appearance={{ elements: { avatarBox: 'h-8 w-8 ring-2 ring-cyan-400/30' } }} /></Show></> : <Link href="/sign-in" className="shrink-0 rounded-full px-3 py-1.5">Sign in</Link>}
      </nav>
    </header>
  );
}
