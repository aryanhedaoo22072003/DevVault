import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import {
  LOCAL_RUN_HISTORY_LIMIT,
  LOCAL_RUNS_PER_MINUTE,
  localPracticeRateKey,
  localRunOutcome,
  localRunSchema,
} from "@/lib/local-practice";
import { practiceOwnerFilter, sourceHash } from "@/lib/practice";
import { ChallengePracticeModel } from "@/models/challenge-practice.model";
import { CodingChallengeModel } from "@/models/coding-challenge.model";
import { ExecutionRateLimitModel } from "@/models/execution-rate-limit.model";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      { error: "Sign in to save local practice history." },
      { status: 401 },
    );
  const parsed = localRunSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid local practice result." },
      { status: 400 },
    );
  await connectToDatabase();
  const rateNow = new Date();
  const rate = await ExecutionRateLimitModel.findOneAndUpdate(
    { key: localPracticeRateKey(userId, rateNow) },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date(rateNow.getTime() + 120_000) },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();
  if (rate && rate.count > LOCAL_RUNS_PER_MINUTE)
    return NextResponse.json(
      { error: "Local practice history limit reached. Try again shortly." },
      { status: 429 },
    );
  const challenge = await CodingChallengeModel.findOne({
    slug: parsed.data.challengeSlug,
    status: "published",
  })
    .select("_id slug supportedLanguages sampleTestCases")
    .lean();
  if (!challenge)
    return NextResponse.json(
      { error: "Challenge is unavailable." },
      { status: 404 },
    );
  if (!challenge.supportedLanguages.includes(parsed.data.language))
    return NextResponse.json(
      { error: "Language is not supported." },
      { status: 400 },
    );
  if (parsed.data.testResults.length !== challenge.sampleTestCases.length)
    return NextResponse.json(
      { error: "Public test count does not match this challenge." },
      { status: 400 },
    );
  const now = new Date();
  const codeHash = sourceHash(parsed.data.code);
  const passedTests = parsed.data.testResults.filter(Boolean).length;
  const totalTests = challenge.sampleTestCases.length;
  const outcome = localRunOutcome({
    executionOk: parsed.data.executionOk,
    passedTests,
    totalTests,
  });
  const filter = practiceOwnerFilter(userId, String(challenge._id));
  const currentDraft = { code: parsed.data.code, updatedAt: now };
  const update: Record<string, unknown> = {
    $setOnInsert: {
      clerkUserId: userId,
      challengeId: challenge._id,
      challengeSlug: challenge.slug,
    },
    $addToSet: { localAttemptedLanguages: parsed.data.language },
    $push: {
      localRuns: {
        $each: [
          {
            language: parsed.data.language,
            codeHash,
            runAt: now,
            passedTests,
            totalTests,
            outcome,
            verified: false,
          },
        ],
        $slice: -LOCAL_RUN_HISTORY_LIMIT,
      },
    },
  };
  update.$set = { [`drafts.${parsed.data.language}`]: currentDraft };
  if (outcome === "passed")
    Object.assign(update.$set as Record<string, unknown>, {
      [`practicePassed.${parsed.data.language}`]: { codeHash, passedAt: now },
    });
  try {
    const saved = await ChallengePracticeModel.updateOne(filter, update, {
      upsert: true,
      setDefaultsOnInsert: true,
    });
    if (!saved.acknowledged) throw new Error("WRITE_NOT_ACKNOWLEDGED");
  } catch {
    return NextResponse.json(
      {
        error:
          "Practice history could not be saved. Your draft remains in the editor.",
      },
      { status: 500 },
    );
  }
  revalidatePath("/practice");
  revalidatePath("/dashboard/practice");
  revalidatePath("/dashboard");
  revalidatePath(`/practice/${challenge.slug}`);
  return NextResponse.json({
    saved: true,
    verified: false,
    outcome,
    passedTests,
    totalTests,
    xpAwarded: 0,
  });
}
