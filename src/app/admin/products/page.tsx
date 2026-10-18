import Link from 'next/link';

import { productCatalog } from '@/data/catalog';

export default function AdminProductsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="section-shell py-12 md:py-16">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-violet-300">Admin</p>
            <h1 className="text-4xl font-semibold text-white">Product management</h1>
          </div>
          <Link href="/admin" className="rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm text-slate-200">
            Back to overview
          </Link>
        </div>

        <div className="mb-8 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Create a new product</h2>
              <p className="mt-2 text-sm text-slate-400">This CRUD shell is ready to connect to MongoDB once the credentials are set.</p>
            </div>
            <button className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white">New product</button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-900/70">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="border-b border-white/10 bg-slate-950/70 text-xs uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-5 py-4">Product</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Price</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {productCatalog.map((product) => (
                <tr key={product.id} className="border-b border-white/10 last:border-0">
                  <td className="px-5 py-4">
                    <div className="font-medium text-white">{product.title}</div>
                    <div className="mt-1 text-xs text-slate-400">{product.demoLabel}</div>
                  </td>
                  <td className="px-5 py-4">{product.category}</td>
                  <td className="px-5 py-4">{product.format}</td>
                  <td className="px-5 py-4">{product.price}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white">Edit</button>
                      <button className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
