import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import {
  CODING_PRACTICE_XP,
  executionRequestSchema,
  type ExecutionStatus,
} from "@/lib/execution";
import {
  enforceExecutionRateLimit,
  executeTests,
  getExecutionAvailability,
} from "@/lib/execution-server";
import { ChallengeSubmissionModel } from "@/models/challenge-submission.model";
import { CodingChallengeModel } from "@/models/coding-challenge.model";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      { error: "Sign in to submit solutions." },
      { status: 401 },
    );
  const parsed = executionRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Choose a supported language and provide valid code." },
      { status: 400 },
    );
  const availability = await getExecutionAvailability();
  if (!availability.operational)
    return NextResponse.json({ error: availability.reason }, { status: 503 });
  try {
    await enforceExecutionRateLimit(userId, "submit");
  } catch {
    return NextResponse.json(
      { error: "Submission limit reached. Try again in a minute." },
      { status: 429 },
    );
  }
  await connectToDatabase();
  const challenge = await CodingChallengeModel.findOne({
    slug: parsed.data.challengeSlug,
    status: "published",
  })
    .select("+privateTestCases")
    .lean();
  if (!challenge)
    return NextResponse.json(
      { error: "Challenge is unavailable." },
      { status: 404 },
    );
  if (!challenge.supportedLanguages.includes(parsed.data.language))
    return NextResponse.json(
      { error: "Language is not supported for this challenge." },
      { status: 400 },
    );
  if (!challenge.privateTestCases.length)
    return NextResponse.json(
      { error: "Verified grading is not configured for this challenge." },
      { status: 409 },
    );
  const submission = await ChallengeSubmissionModel.create({
    clerkUserId: userId,
    challengeId: challenge._id,
    challengeSlug: challenge.slug,
    challengeTitle: challenge.title,
    language: parsed.data.language,
    sourceCode: parsed.data.code,
    status: "running",
    totalTests: challenge.privateTestCases.length,
  });
  try {
    const results = await executeTests(
      parsed.data.language,
      parsed.data.code,
      challenge.entrypoint,
      challenge.privateTestCases,
    );
    const passedTests = results.filter((result) => result.passed).length;
    const failure = results.find((result) => !result.passed);
    const status: ExecutionStatus =
      passedTests === challenge.privateTestCases.length
        ? "accepted"
        : (failure?.status ?? "wrong_answer");
    const xpAwarded = CODING_PRACTICE_XP;
    const runtimeSeconds = results.reduce(
      (sum, result) => sum + (result.time ?? 0),
      0,
    );
    const memoryKb = Math.max(
      0,
      ...results.map((result) => result.memory ?? 0),
    );
    await ChallengeSubmissionModel.updateOne(
      { _id: submission._id, clerkUserId: userId },
      { $set: { status, passedTests, runtimeSeconds, memoryKb, xpAwarded } },
    );
    return NextResponse.json({
      submissionId: String(submission._id),
      status,
      passedTests,
      totalTests: challenge.privateTestCases.length,
      xpAwarded,
    });
  } catch {
    await ChallengeSubmissionModel.updateOne(
      { _id: submission._id, clerkUserId: userId, status: "running" },
      { $set: { status: "service_error" } },
    );
    return NextResponse.json(
      {
        error: "The isolated execution service is temporarily unavailable.",
        submissionId: String(submission._id),
      },
      { status: 503 },
    );
  }
}
