import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { SqlPlayground } from '@/components/sql-playground';
import { VioletEclipseBackground } from '@/components/violet-eclipse-background';
import { connectToDatabase } from '@/lib/db';
import { SQL_WORKSPACE } from '@/lib/sql-playground';
import { PlaygroundDraftModel } from '@/models/playground-draft.model';

export default async function SqlPlaygroundPage(){const {userId}=await auth();let initialCode:string|undefined;if(userId){await connectToDatabase();const draft=await PlaygroundDraftModel.findOne({clerkUserId:userId,workspace:SQL_WORKSPACE,language:'sql'}).select('code').lean();initialCode=draft?.code}return <main className="relative min-h-screen bg-slate-950 text-slate-100"><VioletEclipseBackground/><Navbar/><div className="section-shell py-8 md:py-12"><header className="mb-7"><Link href="/practice" className="text-xs font-semibold uppercase tracking-wider text-violet-300">← Practice hub</Link><p className="mt-5 text-xs font-semibold uppercase tracking-[.22em] text-amber-200">Browser SQLite laboratory</p><h1 className="mt-2 text-4xl font-semibold text-white md:text-5xl">SQL Playground</h1><p className="mt-3 max-w-3xl text-slate-400">Explore joins, aggregation, subqueries, CTEs, and window functions against curated disposable data. No query can reach DevVault MongoDB or production systems.</p></header><SqlPlayground initialCode={initialCode} signedIn={Boolean(userId)}/></div></main>}
