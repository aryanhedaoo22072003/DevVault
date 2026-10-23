'use client';

import dynamic from 'next/dynamic';
import { LockKeyhole, Play, Send } from 'lucide-react';
import { useState } from 'react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false, loading: () => <div className="flex h-[460px] items-center justify-center bg-[#07111d] text-sm text-slate-400">Loading editor…</div> });
type Template = { language: 'python' | 'javascript'; code: string };
export function ChallengeEditor({ templates }: { templates: Template[] }) {
  const [language, setLanguage] = useState<Template['language']>(templates[0]?.language ?? 'python');
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries(templates.map((item) => [item.language, item.code])));
  return <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/75 shadow-glow"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Code workspace</p><p className="mt-1 text-xs text-slate-500">Editing is local to this browser tab.</p></div><label className="text-xs text-slate-400">Language<select value={language} onChange={(event) => setLanguage(event.target.value as Template['language'])} className="ml-2 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">{templates.map((template) => <option key={template.language} value={template.language}>{template.language === 'python' ? 'Python' : 'JavaScript'}</option>)}</select></label></div>
    <MonacoEditor height="460px" theme="vs-dark" language={language} value={drafts[language] ?? ''} onChange={(value) => setDrafts((current) => ({ ...current, [language]: value ?? '' }))} options={{ minimap: { enabled: false }, fontSize: 14, lineHeight: 22, automaticLayout: true, scrollBeyondLastLine: false, tabSize: 2, padding: { top: 16 } }} />
    <div className="border-t border-white/10 p-4"><div className="flex flex-wrap gap-2"><button type="button" disabled title="Code execution arrives in Stage 2" className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-500"><Play className="h-4 w-4"/>Run unavailable</button><button type="button" disabled title="Submissions arrive with the secure runner in Stage 2" className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-cyan-600/40 px-4 py-2 text-sm font-semibold text-slate-400"><Send className="h-4 w-4"/>Submit unavailable</button></div><p className="mt-3 flex items-start gap-2 text-xs leading-5 text-amber-200"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0"/>Stage 1 never executes code. A sandboxed runner and verified submissions will be introduced separately.</p></div>
  </section>;
}
