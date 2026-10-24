import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
const findOne = vi.fn();
const updateOne = vi.fn();
const findOneAndUpdate = vi.fn();
const revalidatePath = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ auth }));
vi.mock("@/lib/db", () => ({ connectToDatabase: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/models/coding-challenge.model", () => ({
  CodingChallengeModel: { findOne },
}));
vi.mock("@/models/challenge-practice.model", () => ({
  ChallengePracticeModel: { updateOne },
}));
vi.mock("@/models/execution-rate-limit.model", () => ({
  ExecutionRateLimitModel: { findOneAndUpdate },
}));

const request = (extra: Record<string, unknown> = {}) =>
  new Request("http://localhost/api/practice/local-runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challengeSlug: "reverse-string",
      language: "python",
      code: "def reverse_string(value): return value[::-1]",
      testResults: [true, true],
      executionOk: true,
      ...extra,
    }),
  });

describe("local practice history route", () => {
  beforeEach(() => {
    auth.mockReset();
    findOne.mockReset();
    updateOne.mockReset();
    findOneAndUpdate.mockReset();
    revalidatePath.mockReset();
    findOneAndUpdate.mockReturnValue({ lean: async () => ({ count: 1 }) });
    vi.resetModules();
  });
  it("rejects anonymous history writes", async () => {
    auth.mockResolvedValue({ userId: null });
    const { POST } = await import("./route");
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(updateOne).not.toHaveBeenCalled();
  });
  it("enforces the persistent per-user rate limit before storing history", async () => {
    auth.mockResolvedValue({ userId: "user_real" });
    findOneAndUpdate.mockReturnValue({ lean: async () => ({ count: 31 }) });
    const { POST } = await import("./route");
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(updateOne).not.toHaveBeenCalled();
  });
  it("derives ownership from Clerk, stores only a hash, labels the pass unverified, and awards zero XP", async () => {
    auth.mockResolvedValue({ userId: "user_real" });
    findOne.mockReturnValue({
      select: () => ({
        lean: async () => ({
          _id: "challenge_id",
          slug: "reverse-string",
          supportedLanguages: ["python", "javascript"],
          sampleTestCases: [{}, {}],
        }),
      }),
    });
    updateOne.mockResolvedValue({ acknowledged: true });
    const { POST } = await import("./route");
    const response = await POST(request({ clerkUserId: "user_forged" }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      verified: false,
      outcome: "passed",
      xpAwarded: 0,
    });
    expect(updateOne).toHaveBeenCalledWith(
      { clerkUserId: "user_real", challengeId: "challenge_id" },
      expect.objectContaining({
        $push: expect.objectContaining({
          localRuns: expect.objectContaining({ $slice: -50 }),
        }),
      }),
      expect.anything(),
    );
    const update = updateOne.mock.calls[0][1];
    expect(update.$set["drafts.python"].code).toContain("def reverse_string");
    expect(update.$set["practicePassed.python"].codeHash).toMatch(
      /^[a-f0-9]{64}$/,
    );
    expect(update.$push.localRuns.$each[0]).not.toHaveProperty("code");
    expect(revalidatePath).toHaveBeenCalledWith("/practice");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/practice");
  });
  it("rejects incomplete public-test reports before writing history", async () => {
    auth.mockResolvedValue({ userId: "user_real" });
    findOne.mockReturnValue({
      select: () => ({
        lean: async () => ({
          _id: "challenge_id",
          slug: "reverse-string",
          supportedLanguages: ["python"],
          sampleTestCases: [{}, {}],
        }),
      }),
    });
    const { POST } = await import("./route");
    const response = await POST(request({ testResults: [true] }));
    expect(response.status).toBe(400);
    expect(updateOne).not.toHaveBeenCalled();
  });
  it("persists failed runs and the matching draft without setting a pass record", async () => {
    auth.mockResolvedValue({ userId: "user_real" });
    findOne.mockReturnValue({
      select: () => ({
        lean: async () => ({
          _id: "challenge_id",
          slug: "reverse-string",
          supportedLanguages: ["javascript"],
          sampleTestCases: [{}, {}],
        }),
      }),
    });
    updateOne.mockResolvedValue({ acknowledged: true });
    const { POST } = await import("./route");
    const response = await POST(
      request({
        language: "javascript",
        code: "function reverseString(){ return 'wrong'; }",
        testResults: [false, false],
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      outcome: "failed",
      passedTests: 0,
      totalTests: 2,
      xpAwarded: 0,
    });
    const update = updateOne.mock.calls[0][1];
    expect(update.$set["drafts.javascript"].code).toContain("wrong");
    expect(update.$set).not.toHaveProperty("practicePassed.javascript");
  });
  it("returns a clear error when MongoDB does not acknowledge the history write", async () => {
    auth.mockResolvedValue({ userId: "user_real" });
    findOne.mockReturnValue({
      select: () => ({
        lean: async () => ({
          _id: "challenge_id",
          slug: "reverse-string",
          supportedLanguages: ["python"],
          sampleTestCases: [{}, {}],
        }),
      }),
    });
    updateOne.mockResolvedValue({ acknowledged: false });
    const { POST } = await import("./route");
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining("could not be saved"),
    });
  });
});
