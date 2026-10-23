import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { executionRequestSchema } from '@/lib/execution';
import { enforceExecutionRateLimit, executeTests, getExecutionAvailability } from '@/lib/execution-server';
import { CodingChallengeModel } from '@/models/coding-challenge.model';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Sign in to run code.' }, { status: 401 });
  const parsed = executionRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a supported language and provide valid code.' }, { status: 400 });
  const availability = await getExecutionAvailability();
  if (!availability.operational) return NextResponse.json({ error: availability.reason }, { status: 503 });
  try { await enforceExecutionRateLimit(userId, 'run'); } catch { return NextResponse.json({ error: 'Run limit reached. Try again in a minute.' }, { status: 429 }); }
  await connectToDatabase();
  const challenge = await CodingChallengeModel.findOne({ slug: parsed.data.challengeSlug, status: 'published' }).select('-privateTestCases').lean();
  if (!challenge) return NextResponse.json({ error: 'Challenge is unavailable.' }, { status: 404 });
  if (!challenge.supportedLanguages.includes(parsed.data.language)) return NextResponse.json({ error: 'Language is not supported for this challenge.' }, { status: 400 });
  try {
    const results = await executeTests(parsed.data.language, parsed.data.code, challenge.entrypoint, challenge.sampleTestCases);
    return NextResponse.json({ results: results.map((result, index) => ({ test: index + 1, input: challenge.sampleTestCases[index]?.input, expectedOutput: challenge.sampleTestCases[index]?.expectedOutput, ...result })) });
  } catch { return NextResponse.json({ error: 'The isolated execution service is temporarily unavailable.' }, { status: 503 }); }
}
