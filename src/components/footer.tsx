import Link from 'next/link';

import { BrandLockup } from '@/components/brand-logo';

const footerColumns = [
  {
    title: 'Platform',
    links: [{ label: 'Marketplace', href: '/marketplace' }, { label: 'Learning Lab', href: '/learn' }, { label: 'Practice Arena', href: '/practice' }, { label: 'AI Copilot' }],
  },
  {
    title: 'Company',
    links: [{ label: 'About' }, { label: 'Careers' }, { label: 'Partners' }, { label: 'Changelog' }],
  },
  {
    title: 'Resources',
    links: [{ label: 'Docs' }, { label: 'Guides', href: '/learn' }, { label: 'Community' }, { label: 'Support' }],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="section-shell py-12">
        <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <Link href="/" className="inline-flex rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300" aria-label="DevVault home">
              <BrandLockup />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">
              Premium developer products, structured learning, and coding systems for building the next generation of software.
            </p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-slate-300">
                {column.title}
              </h3>
              <ul className="mt-5 space-y-3 text-sm text-slate-400">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? <Link href={link.href} className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">{link.label}</Link> : <span className="text-slate-500">{link.label}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>© 2026 DevVault. Built for developers who ship.</p>
          <div className="flex items-center gap-5 text-slate-500" aria-label="Policies pending owner review">
            <span>Privacy</span><span>Terms</span><span>Security</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
