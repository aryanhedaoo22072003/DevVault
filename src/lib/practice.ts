import { z } from "zod";

import { createHash } from "node:crypto";

export type PracticeProgress =
  | "not-started"
  | "viewed"
  | "in-progress"
  | "practice-passed"
  | "official-solved";
export const practiceStateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("view") }),
  z.object({ action: z.literal("bookmark"), bookmarked: z.boolean() }),
  z.object({
    action: z.literal("draft"),
    language: z.enum(["python", "javascript"]),
    code: z.string().max(30_000),
  }),
  z.object({
    action: z.literal("attempt"),
    language: z.enum(["python", "javascript"]),
  }),
  z.object({
    action: z.literal("reset"),
    language: z.enum(["python", "javascript"]),
  }),
]);

export function sourceHash(source: string) {
  return createHash("sha256").update(source, "utf8").digest("hex");
}
export function meaningfulDraft(code: string, starter: string) {
  return code.trim() !== starter.trim();
}
export function hasCurrentPracticePass(input: {
  drafts?: Partial<Record<"python" | "javascript", { code: string }>>;
  practicePassed?: Partial<
    Record<"python" | "javascript", { codeHash: string }>
  >;
}) {
  return (["python", "javascript"] as const).some((language) =>
    Boolean(
      input.drafts?.[language]?.code &&
      input.practicePassed?.[language]?.codeHash ===
        sourceHash(input.drafts[language]!.code),
    ),
  );
}

export function practiceProgress(input: {
  solved: boolean;
  viewed: boolean;
  hasDraft: boolean;
  attempted?: boolean;
  practicePassed?: boolean;
}): PracticeProgress {
  if (input.solved) return "official-solved";
  if (input.practicePassed) return "practice-passed";
  if (input.hasDraft || input.attempted) return "in-progress";
  if (input.viewed) return "viewed";
  return "not-started";
}

export function resolveChallengePracticeStatus(
  state:
    | {
        viewedAt?: unknown;
        draftStartedLanguages?: unknown[];
        localAttemptedLanguages?: unknown[];
        drafts?: Partial<Record<"python" | "javascript", { code: string }>>;
        practicePassed?: Partial<
          Record<"python" | "javascript", { codeHash: string }>
        >;
      }
    | null
    | undefined,
  officiallySolved: boolean,
): PracticeProgress {
  return practiceProgress({
    solved: officiallySolved,
    viewed: Boolean(state?.viewedAt),
    hasDraft: Boolean(state?.draftStartedLanguages?.length),
    attempted: Boolean(state?.localAttemptedLanguages?.length),
    practicePassed: state ? hasCurrentPracticePass(state) : false,
  });
}

export function practiceSummary(
  rows: Array<{ progress: PracticeProgress; bookmarked: boolean }>,
  total: number,
) {
  return {
    total,
    viewed: rows.filter((row) => row.progress === "viewed").length,
    inProgress: rows.filter((row) => row.progress === "in-progress").length,
    practicePassed: rows.filter((row) => row.progress === "practice-passed")
      .length,
    solved: rows.filter((row) => row.progress === "official-solved").length,
    bookmarked: rows.filter((row) => row.bookmarked).length,
  };
}

export function practiceOwnerFilter(clerkUserId: string, challengeId: string) {
  return { clerkUserId, challengeId };
}
