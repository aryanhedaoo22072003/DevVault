import type { ReactNode } from 'react';

function inline(value: string): ReactNode[] {
  return value.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index} className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-cyan-300">{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    return part;
  });
}

export function SafeMarkdown({ source }: { source: string }) {
  const lines = source.replace(/<[^>]*>/g, '').split('\n');
  return <div className="space-y-3 text-sm leading-7 text-slate-300">{lines.map((line, index) => {
    if (line.startsWith('### ')) return <h3 key={index} className="pt-3 text-lg font-semibold text-white">{inline(line.slice(4))}</h3>;
    if (line.startsWith('## ')) return <h2 key={index} className="pt-4 text-xl font-semibold text-white">{inline(line.slice(3))}</h2>;
    if (line.startsWith('# ')) return <h1 key={index} className="pt-4 text-2xl font-semibold text-white">{inline(line.slice(2))}</h1>;
    if (line.startsWith('- ')) return <div key={index} className="flex gap-2"><span className="text-cyan-400">•</span><span>{inline(line.slice(2))}</span></div>;
    return line.trim() ? <p key={index}>{inline(line)}</p> : <div key={index} className="h-1" />;
  })}</div>;
}

const keywordPattern = /\b(const|let|function|return|if|else|await|async|type|interface|import|export|from|throw|new|true|false|null)\b/g;
const keywordSet = new Set(['const','let','function','return','if','else','await','async','type','interface','import','export','from','throw','new','true','false','null']);
export function HighlightedCode({ code, language }: { code: string; language: string }) {
  const parts = code.split(keywordPattern);
  return <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#06111d]"><div className="border-b border-white/10 px-4 py-2 text-xs uppercase tracking-wider text-cyan-300">{language || 'text'}</div><pre className="overflow-x-auto p-4 text-sm leading-6 text-slate-200"><code>{parts.map((part, index) => keywordSet.has(part) ? <span key={index} className="text-cyan-300">{part}</span> : part)}</code></pre></div>;
}

export function SafeFlowchart({ definition, title }: { definition: string; title?: string }) {
  const nodes = parseSafeFlowchart(definition);
  if (nodes.length < 2) return <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">Use the safe format: Request -&gt; Validate -&gt; Respond</p>;
  return <figure><figcaption className="mb-3 text-xs uppercase tracking-wider text-slate-500">{title || 'Flowchart'}</figcaption><div className="flex flex-wrap items-center gap-2">{nodes.map((node, index) => <div key={`${node}-${index}`} className="flex items-center gap-2"><span className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">{node}</span>{index < nodes.length - 1 ? <span aria-hidden="true" className="text-cyan-400">→</span> : null}</div>)}</div></figure>;
}

export function parseSafeFlowchart(definition: string) {
  return definition.split(/\s*->\s*/).map((node) => node.replace(/[^a-zA-Z0-9 _-]/g, '').trim()).filter(Boolean).slice(0, 12);
}
