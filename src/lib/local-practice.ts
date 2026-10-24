import { z } from "zod";

export const LOCAL_RUN_HISTORY_LIMIT = 50;
export const LOCAL_RUNS_PER_MINUTE = 30;
export const localRunSchema = z.object({
  challengeSlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(180),
  language: z.enum(["python", "javascript"]),
  code: z
    .string()
    .min(1)
    .max(30_000)
    .refine(
      (value) => Buffer.byteLength(value, "utf8") <= 30_000,
      "Source exceeds the byte limit.",
    ),
  testResults: z.array(z.boolean()).max(20),
  executionOk: z.boolean(),
});

export function localPracticeRateKey(userId: string, now = new Date()) {
  return `local-practice:${userId}:${Math.floor(now.getTime() / 60_000)}`;
}

export function localRunOutcome(input: {
  executionOk: boolean;
  passedTests: number;
  totalTests: number;
}): "passed" | "failed" | "error" {
  if (!input.executionOk) return "error";
  return input.totalTests > 0 && input.passedTests === input.totalTests
    ? "passed"
    : "failed";
}
