'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function LessonProgressControl({ pathSlug, lessonRef, signedIn, initiallyCompleted }: { pathSlug: string; lessonRef: string; signedIn: boolean; initiallyCompleted: boolean }) {
  const [completed, setCompleted] = useState(initiallyCompleted); const [saving, setSaving] = useState(false); const [message, setMessage] = useState('');
  useEffect(() => {
    if (!signedIn) return;
    void fetch('/api/learning/visit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pathSlug, lessonRef }) })
      .then(async (response) => {
        if (!response.ok) { const payload = await response.json().catch(() => ({})); setMessage(payload.error ?? 'Unable to save your last visited lesson.'); }
      })
      .catch(() => setMessage('Unable to save your last visited lesson.'));
  }, [lessonRef, pathSlug, signedIn]);
  if (!signedIn) return <div className="mt-8 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-slate-300"><Link className="font-semibold text-cyan-200 hover:text-cyan-100" href={`/sign-in?redirect_url=${encodeURIComponent(`/learn/${pathSlug}`)}`}>Sign in</Link> to save progress, earn XP, and resume later.</div>;
  async function complete() {
    setSaving(true); setMessage(''); const response = await fetch('/api/learning/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pathSlug, lessonRef }) }); const payload = await response.json().catch(() => ({}));
    if (response.ok) { setCompleted(true); setMessage(payload.awarded?.length ? `Completed · ${payload.awarded.map((key: string) => key.replaceAll('-', ' ')).join(', ')} unlocked.` : 'Progress saved.'); } else setMessage(payload.error ?? 'Unable to save progress.'); setSaving(false);
  }
  return <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6"><button type="button" onClick={complete} disabled={completed || saving} className="rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{completed ? 'Lesson completed' : saving ? 'Saving…' : 'Mark lesson complete'}</button>{message ? <p role="status" className="text-sm text-cyan-200">{message}</p> : null}</div>;
}
