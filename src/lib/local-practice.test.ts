import { describe, expect, it } from "vitest";
import {
  LOCAL_RUN_HISTORY_LIMIT,
  LOCAL_RUNS_PER_MINUTE,
  localPracticeRateKey,
  localRunOutcome,
  localRunSchema,
} from "./local-practice";

describe("unverified local practice history", () => {
  const valid = {
    challengeSlug: "reverse-string",
    language: "python" as const,
    code: "def reverse_string(value): return value[::-1]",
    testResults: [true, true],
    passedTests: 2,
    totalTests: 2,
    executionOk: true,
  };
  it("accepts correct, incorrect, and incomplete source while bounding counts and source size", () => {
    expect(localRunSchema.safeParse(valid).success).toBe(true);
    expect(
      localRunSchema.safeParse({
        ...valid,
        code: "pass",
        testResults: [false, false],
      }).success,
    ).toBe(true);
    expect(
      localRunSchema.safeParse({ ...valid, testResults: Array(21).fill(true) })
        .success,
    ).toBe(false);
    expect(
      localRunSchema.safeParse({ ...valid, code: "x".repeat(30_001) }).success,
    ).toBe(false);
  });
  it("labels outcomes without claiming verification or XP", () => {
    expect(localRunOutcome(valid)).toBe("passed");
    expect(localRunOutcome({ ...valid, passedTests: 1 })).toBe("failed");
    expect(localRunOutcome({ ...valid, executionOk: false })).toBe("error");
  });
  it("uses user-scoped persistent rate-limit keys", () => {
    const now = new Date("2026-01-01T00:00:30Z");
    expect(localPracticeRateKey("user_a", now)).not.toBe(
      localPracticeRateKey("user_b", now),
    );
    expect(LOCAL_RUNS_PER_MINUTE).toBe(30);
  });
  it("defines bounded per-challenge history retention", () => {
    expect(LOCAL_RUN_HISTORY_LIMIT).toBe(50);
  });
});
