import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import {
  meaningfulDraft,
  practiceOwnerFilter,
  practiceStateSchema,
} from "@/lib/practice";
import { ChallengePracticeModel } from "@/models/challenge-practice.model";
import { CodingChallengeModel } from "@/models/coding-challenge.model";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      { error: "Sign in to save practice activity." },
      { status: 401 },
    );
  const parsed = practiceStateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid practice update." },
      { status: 400 },
    );
  const data = parsed.data;
  const { slug } = await params;
  await connectToDatabase();
  const challenge = await CodingChallengeModel.findOne({
    slug,
    status: "published",
  })
    .select("_id slug supportedLanguages starterCode")
    .lean();
  if (!challenge)
    return NextResponse.json(
      { error: "Challenge is unavailable." },
      { status: 404 },
    );
  if (
    "language" in data &&
    !challenge.supportedLanguages.includes(data.language)
  )
    return NextResponse.json(
      { error: "Language is not supported." },
      { status: 400 },
    );
  const filter = practiceOwnerFilter(userId, String(challenge._id));
  const now = new Date();
  const base = {
    $setOnInsert: {
      clerkUserId: userId,
      challengeId: challenge._id,
      challengeSlug: challenge.slug,
    },
  };
  if (data.action === "view")
    await ChallengePracticeModel.updateOne(
      filter,
      { ...base, $max: { viewedAt: now } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  if (data.action === "bookmark")
    await ChallengePracticeModel.updateOne(
      filter,
      { ...base, $set: { bookmarked: data.bookmarked } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  if (data.action === "draft") {
    const starter =
      challenge.starterCode.find((item) => item.language === data.language)
        ?.code ?? "";
    const meaningful = meaningfulDraft(data.code, starter);
    await ChallengePracticeModel.updateOne(
      filter,
      {
        ...base,
        $set: {
          [`drafts.${data.language}`]: { code: data.code, updatedAt: now },
        },
        ...(meaningful
          ? { $addToSet: { draftStartedLanguages: data.language } }
          : { $pull: { draftStartedLanguages: data.language } }),
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }
  if (data.action === "attempt")
    await ChallengePracticeModel.updateOne(
      filter,
      { ...base, $addToSet: { localAttemptedLanguages: data.language } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  if (data.action === "reset")
    await ChallengePracticeModel.updateOne(
      filter,
      {
        ...base,
        $unset: { [`drafts.${data.language}`]: 1 },
        $pull: { draftStartedLanguages: data.language },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  return NextResponse.json({ ok: true });
}
