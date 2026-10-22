'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { BarChart3, BookOpenText, Boxes, ChevronLeft, FolderOpen, LayoutGrid, Menu, Package, Settings, ShoppingBag, Store, Users, X } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

const links = [
  { href: '/admin', label: 'Overview', icon: BarChart3, exact: true },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: LayoutGrid },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/assets', label: 'Digital Assets', icon: FolderOpen },
  { href: '/admin/learning', label: 'Learning Content', icon: BookOpenText },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = (
    <>
      <div className="flex h-20 items-center justify-between border-b border-white/10 px-4">
        <Link href="/admin" className="flex items-center gap-3" aria-label="DevVault admin home">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 font-bold text-white">D</span>
          {!collapsed ? <span className="font-semibold text-white">DevVault <span className="text-cyan-400">Admin</span></span> : null}
        </Link>
        <button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-slate-400 lg:hidden" aria-label="Close admin navigation"><X className="h-5 w-5" /></button>
      </div>
      <nav className="flex-1 space-y-1 p-3" aria-label="Admin navigation">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? path === href : path.startsWith(href);
          return <Link key={href} href={href} onClick={() => setMobileOpen(false)} aria-current={active ? 'page' : undefined} title={collapsed ? label : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? 'bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Icon className="h-4 w-4 shrink-0" />{!collapsed ? label : null}</Link>;
        })}
      </nav>
      <div className="space-y-2 border-t border-white/10 p-3">
        <Link href="/marketplace" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"><Store className="h-4 w-4 shrink-0" />{!collapsed ? 'Back to Marketplace' : null}</Link>
        <div className="mb-2 flex justify-center"><ThemeToggle compact={collapsed} /></div><div className="flex items-center justify-between rounded-xl bg-white/5 p-2">
          <UserButton appearance={{ elements: { avatarBox: 'h-8 w-8 ring-2 ring-violet-400/20' } }} />
          {!collapsed ? <span className="mr-2 text-xs font-medium uppercase tracking-wider text-slate-500">Admin account</span> : null}
        </div>
      </div>
    </>
  );

  return <div className="min-h-screen bg-slate-950 text-slate-100">
    <aside className={`fixed inset-y-0 left-0 z-40 hidden border-r border-white/10 bg-slate-950/95 backdrop-blur-xl transition-[width] lg:flex lg:flex-col ${collapsed ? 'w-20' : 'w-64'}`}>{nav}<button type="button" onClick={() => setCollapsed((value) => !value)} className="absolute -right-3 top-24 rounded-full border border-white/10 bg-slate-900 p-1 text-slate-300" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><ChevronLeft className={`h-4 w-4 transition ${collapsed ? 'rotate-180' : ''}`} /></button></aside>
    {mobileOpen ? <div className="fixed inset-0 z-50 lg:hidden"><button type="button" className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" /><aside className="relative flex h-full w-72 flex-col border-r border-white/10 bg-slate-950">{nav}</aside></div> : null}
    <div className={`transition-[padding] ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
      <header className="sticky top-0 z-30 flex h-16 items-center border-b border-white/10 bg-slate-950/80 px-4 backdrop-blur-xl lg:hidden"><button type="button" onClick={() => setMobileOpen(true)} className="rounded-xl border border-white/10 bg-white/5 p-2" aria-label="Open admin navigation"><Menu className="h-5 w-5" /></button><span className="ml-3 font-semibold">DevVault Admin</span></header>
      <main className="min-h-screen p-4 sm:p-6 xl:p-8">{children}</main>
    </div>
  </div>;
}
