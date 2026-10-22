import Link from 'next/link';

const footerColumns = [
  {
    title: 'Platform',
    links: ['Marketplace', 'Learning Lab', 'Practice Arena', 'AI Copilot'],
  },
  {
    title: 'Company',
    links: ['About', 'Careers', 'Partners', 'Changelog'],
  },
  {
    title: 'Resources',
    links: ['Docs', 'Guides', 'Community', 'Support'],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="section-shell py-12">
        <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 text-sm font-bold text-white">
                D
              </div>
              <div className="text-lg font-semibold text-white">
                Dev<span className="text-cyan-400">Vault</span>
              </div>
            </div>
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
                  <li key={link}>
                    <Link href="#" className="transition hover:text-white">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>© 2026 DevVault. Built for developers who ship.</p>
          <div className="flex items-center gap-5">
            <Link href="#" className="transition hover:text-white">
              Privacy
            </Link>
            <Link href="#" className="transition hover:text-white">
              Terms
            </Link>
            <Link href="#" className="transition hover:text-white">
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
