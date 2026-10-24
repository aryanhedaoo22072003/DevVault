import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { PlaygroundDraftModel } from '@/models/playground-draft.model';

const keySchema = z.object({ workspace: z.string().regex(/^[a-z0-9-]{1,120}$/), language: z.enum(['sql', 'typescript', 'c', 'cpp', 'java']) });
const updateSchema = keySchema.extend({ code: z.string().max(30_000) });

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Sign in to restore playground drafts.' }, { status: 401 });
  const url = new URL(request.url); const parsed = keySchema.safeParse({ workspace: url.searchParams.get('workspace'), language: url.searchParams.get('language') });
  if (!parsed.success) return NextResponse.json({ error: 'Invalid draft request.' }, { status: 400 });
  await connectToDatabase();
  const draft = await PlaygroundDraftModel.findOne({ clerkUserId: userId, ...parsed.data }).select('code updatedAt').lean();
  return NextResponse.json({ code: draft?.code ?? null, updatedAt: draft?.updatedAt ?? null });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Sign in to save playground drafts.' }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid or oversized draft.' }, { status: 400 });
  await connectToDatabase();
  const { workspace, language, code } = parsed.data;
  await PlaygroundDraftModel.updateOne({ clerkUserId: userId, workspace, language }, { $set: { code }, $setOnInsert: { clerkUserId: userId, workspace, language } }, { upsert: true, setDefaultsOnInsert: true });
  return NextResponse.json({ ok: true });
}
