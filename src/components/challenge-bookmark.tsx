'use client';

import { Bookmark } from 'lucide-react';
import { useState } from 'react';

export function ChallengeBookmark({ slug, initialBookmarked, signedIn, compact = false }: { slug: string; initialBookmarked: boolean; signedIn: boolean; compact?: boolean }) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function toggle() { if (!signedIn) { setError('Sign in to bookmark challenges.'); return; } const next = !bookmarked; setBusy(true); setError(''); try { const response = await fetch(`/api/practice/state/${encodeURIComponent(slug)}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action:'bookmark',bookmarked:next }) }); if (!response.ok) { const data = await response.json(); throw new Error(data.error ?? 'Unable to update bookmark.'); } setBookmarked(next); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update bookmark.'); } finally { setBusy(false); } }
  return <div className="relative"><button type="button" onClick={toggle} disabled={busy} aria-pressed={bookmarked} aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark challenge'} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${bookmarked ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200' : 'border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/30'} disabled:opacity-50`}><Bookmark className={`h-4 w-4 ${bookmarked ? 'fill-current' : ''}`}/>{compact ? null : bookmarked ? 'Bookmarked' : 'Bookmark'}</button>{error ? <p role="alert" className="absolute right-0 top-full z-10 mt-2 w-52 rounded-xl border border-amber-400/20 bg-slate-950 p-2 text-xs text-amber-200">{error}</p> : null}</div>;
}
