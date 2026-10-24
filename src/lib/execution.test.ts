import { describe, expect, it } from "vitest";
import {
  buildExecutionSource,
  classifyJudge0Status,
  CODING_PRACTICE_XP,
  executionRateKey,
  executionRequestSchema,
  outputsMatch,
  parseTestInput,
  readJudge0Config,
  truncateOutput,
} from "./execution";

describe("secure execution configuration", () => {
  it("stays disabled without a configured backend", () => {
    expect(readJudge0Config({}).config).toBeUndefined();
  });
  it("rejects non-HTTPS runner endpoints and incomplete credentials", () => {
    expect(
      readJudge0Config({
        JUDGE0_ENDPOINT: "http://runner.test",
        JUDGE0_PYTHON_LANGUAGE_ID: "71",
        JUDGE0_JAVASCRIPT_LANGUAGE_ID: "63",
      }).config,
    ).toBeUndefined();
    expect(
      readJudge0Config({
        JUDGE0_ENDPOINT: "https://runner.test",
        JUDGE0_PYTHON_LANGUAGE_ID: "71",
        JUDGE0_JAVASCRIPT_LANGUAGE_ID: "63",
        JUDGE0_AUTH_HEADER: "X-Auth-Token",
      }).config,
    ).toBeUndefined();
  });
  it("accepts complete server-only configuration", () => {
    expect(
      readJudge0Config({
        JUDGE0_ENDPOINT: "https://runner.test/",
        JUDGE0_PYTHON_LANGUAGE_ID: "71",
        JUDGE0_JAVASCRIPT_LANGUAGE_ID: "63",
        JUDGE0_AUTH_HEADER: "X-Auth-Token",
        JUDGE0_AUTH_TOKEN: "secret",
      }).config?.endpoint,
    ).toBe("https://runner.test");
  });
});

describe("execution input and grading", () => {
  it("validates language and code size", () => {
    expect(
      executionRequestSchema.safeParse({
        challengeSlug: "two-sum",
        language: "python",
        code: "pass",
      }).success,
    ).toBe(true);
    expect(
      executionRequestSchema.safeParse({
        challengeSlug: "two-sum",
        language: "ruby",
        code: "pass",
      }).success,
    ).toBe(false);
    expect(
      executionRequestSchema.safeParse({
        challengeSlug: "two-sum",
        language: "python",
        code: "x".repeat(30_001),
      }).success,
    ).toBe(false);
  });
  it("requires JSON argument arrays", () => {
    expect(parseTestInput("[1,2]")).toEqual([1, 2]);
    expect(() => parseTestInput('{"x":1}')).toThrow();
  });
  it("builds entrypoint harnesses without local execution", () => {
    expect(
      buildExecutionSource(
        "python",
        "def two_sum(a,b): pass",
        "two_sum",
        "[[2,7],9]",
      ),
    ).toContain("two_sum(*__dv_args)");
    expect(
      buildExecutionSource(
        "javascript",
        "function twoSum() {}",
        "two_sum",
        "[]",
      ),
    ).toContain("twoSum(...__dvArgs)");
  });
  it("grades normalized JSON and classifies failures", () => {
    expect(outputsMatch("[0, 1]\n", "[0,1]")).toBe(true);
    expect(outputsMatch("false", "true")).toBe(false);
    expect(classifyJudge0Status(6, "Compilation Error")).toBe("compile_error");
    expect(classifyJudge0Status(5, "Time Limit Exceeded")).toBe("time_limit");
  });
  it("caps output returned to clients", () => {
    expect(truncateOutput("x".repeat(20_000))).toContain("[output truncated]");
  });
});

describe("ownership, rate, and zero-XP policy", () => {
  it("keys rate limits by user and action", () => {
    const now = new Date("2026-01-01T00:00:30Z");
    expect(executionRateKey("user_a", "run", now)).not.toBe(
      executionRateKey("user_b", "run", now),
    );
    expect(executionRateKey("user_a", "run", now)).not.toBe(
      executionRateKey("user_a", "submit", now),
    );
  });
  it("awards zero XP for every coding practice result", () => {
    expect(CODING_PRACTICE_XP).toBe(0);
  });
});
