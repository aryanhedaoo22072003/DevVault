'use client';

import { useState } from 'react';

type PublicQuestion = { prompt: string; choices: string[] };
type QuizResult = { score: number; total: number; percentage: number; feedback: Array<{ correct: boolean; explanation: string }>; xp: number; awarded: string[] };

export function LessonQuiz({ pathSlug, lessonRef, questions }: { pathSlug: string; lessonRef: string; questions: PublicQuestion[] }) {
  const [answers, setAnswers] = useState<Array<number | null>>(() => questions.map(() => null));
  const [result, setResult] = useState<QuizResult | null>(null); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false);
  async function submit() {
    if (answers.some((answer) => answer === null)) { setError('Answer every question before submitting.'); return; }
    setSubmitting(true); setError('');
    const response = await fetch('/api/learning/quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pathSlug, lessonRef, answers }) });
    const payload = await response.json().catch(() => ({ error: 'Unable to read the quiz response.' }));
    if (!response.ok) { setError(payload.error ?? 'Unable to submit quiz.'); setSubmitting(false); return; }
    setResult(payload); setSubmitting(false);
  }
  return <section className="rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Knowledge check</p><h3 className="mt-2 text-xl font-semibold text-white">Lesson quiz</h3></div>{result ? <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-200">{result.score}/{result.total} · {result.percentage}%</span> : null}</div>
    <div className="mt-5 space-y-6">{questions.map((question, questionIndex) => <fieldset key={questionIndex} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4"><legend className="px-1 font-medium text-white">{questionIndex + 1}. {question.prompt}</legend><div className="mt-3 grid gap-2">{question.choices.map((choice, choiceIndex) => <label key={choiceIndex} className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm transition ${answers[questionIndex] === choiceIndex ? 'border-cyan-400 bg-cyan-400/10 text-white' : 'border-white/10 text-slate-300 hover:border-cyan-400/30'}`}><input type="radio" name={`question-${questionIndex}`} value={choiceIndex} checked={answers[questionIndex] === choiceIndex} onChange={() => { const next = [...answers]; next[questionIndex] = choiceIndex; setAnswers(next); setResult(null); }} className="mt-0.5 accent-cyan-400" />{choice}</label>)}</div>{result?.feedback[questionIndex] ? <p role="status" className={`mt-3 rounded-xl p-3 text-sm ${result.feedback[questionIndex].correct ? 'bg-emerald-500/10 text-emerald-200' : 'bg-amber-500/10 text-amber-200'}`}><strong>{result.feedback[questionIndex].correct ? 'Correct.' : 'Not quite.'}</strong> {result.feedback[questionIndex].explanation}</p> : null}</fieldset>)}</div>
    {error ? <p role="alert" className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">{error}</p> : null}
    {result?.awarded.length ? <p className="mt-4 text-sm text-cyan-200">Achievement unlocked · {result.awarded.map((key) => key.replaceAll('-', ' ')).join(', ')}. Total XP: {result.xp}</p> : null}
    <button type="button" onClick={submit} disabled={submitting} className="mt-5 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-950/30 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60">{submitting ? 'Scoring securely…' : result ? 'Submit another attempt' : 'Submit quiz'}</button>
  </section>;
}
