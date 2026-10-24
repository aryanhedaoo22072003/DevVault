import { describe, expect, it } from "vitest";
import {
  hasCurrentPracticePass,
  meaningfulDraft,
  practiceOwnerFilter,
  practiceProgress,
  practiceStateSchema,
  practiceSummary,
  sourceHash,
} from "./practice";
import { ChallengePracticeModel } from "@/models/challenge-practice.model";
import { PlaygroundDraftModel } from "@/models/playground-draft.model";

describe("practice state", () => {
  it("validates autosaves and rejects oversized drafts", () => {
    expect(
      practiceStateSchema.safeParse({
        action: "draft",
        language: "python",
        code: "print(1)",
      }).success,
    ).toBe(true);
    expect(
      practiceStateSchema.safeParse({
        action: "draft",
        language: "python",
        code: "x".repeat(30_001),
      }).success,
    ).toBe(false);
  });
  it("scopes writes to the authenticated owner", () => {
    expect(practiceOwnerFilter("user_a", "challenge_a")).toEqual({
      clerkUserId: "user_a",
      challengeId: "challenge_a",
    });
  });
  it("keeps viewed, attempted, local pass, and official solve distinct", () => {
    expect(
      practiceProgress({ solved: false, viewed: true, hasDraft: false }),
    ).toBe("viewed");
    expect(
      practiceProgress({
        solved: false,
        viewed: true,
        hasDraft: false,
        attempted: true,
      }),
    ).toBe("in-progress");
    expect(
      practiceProgress({
        solved: false,
        viewed: true,
        hasDraft: true,
        practicePassed: true,
      }),
    ).toBe("practice-passed");
    expect(
      practiceProgress({
        solved: true,
        viewed: false,
        hasDraft: false,
        practicePassed: true,
      }),
    ).toBe("official-solved");
  });
  it("calculates mutually exclusive summary categories", () => {
    expect(
      practiceSummary(
        [
          { progress: "not-started", bookmarked: false },
          { progress: "viewed", bookmarked: false },
          { progress: "in-progress", bookmarked: true },
          { progress: "practice-passed", bookmarked: false },
          { progress: "official-solved", bookmarked: false },
        ],
        5,
      ),
    ).toEqual({
      total: 5,
      viewed: 1,
      inProgress: 1,
      practicePassed: 1,
      solved: 1,
      bookmarked: 1,
    });
  });
  it("does not count unchanged starter code as meaningful", () => {
    expect(meaningfulDraft("  pass\n", "pass")).toBe(false);
    expect(meaningfulDraft("return value", "pass")).toBe(true);
  });
  it("ties a local pass to the exact language draft hash", () => {
    const code = "return text[::-1]";
    expect(
      hasCurrentPracticePass({
        drafts: { python: { code } },
        practicePassed: { python: { codeHash: sourceHash(code) } },
      }),
    ).toBe(true);
    expect(
      hasCurrentPracticePass({
        drafts: { python: { code: code + "\n# changed" } },
        practicePassed: { python: { codeHash: sourceHash(code) } },
      }),
    ).toBe(false);
  });
  it("keeps Python and JavaScript pass snapshots independent", () => {
    const python = "return value[::-1]";
    const javascript = "return [...value].reverse().join('')";
    expect(
      hasCurrentPracticePass({
        drafts: {
          python: { code: python },
          javascript: { code: javascript + "; // edited" },
        },
        practicePassed: {
          python: { codeHash: sourceHash(python) },
          javascript: { codeHash: sourceHash(javascript) },
        },
      }),
    ).toBe(true);
    expect(
      hasCurrentPracticePass({
        drafts: {
          python: { code: python + " # edited" },
          javascript: { code: javascript + "; // edited" },
        },
        practicePassed: {
          python: { codeHash: sourceHash(python) },
          javascript: { codeHash: sourceHash(javascript) },
        },
      }),
    ).toBe(false);
  });
  it("models idempotent bookmark state as a boolean", () => {
    expect(
      practiceStateSchema.parse({ action: "bookmark", bookmarked: true }),
    ).toEqual({ action: "bookmark", bookmarked: true });
  });
  it("prevents duplicate user/challenge records with a unique index", () => {
    const index = ChallengePracticeModel.schema
      .indexes()
      .find(([fields]) => fields.clerkUserId === 1 && fields.challengeId === 1);
    expect(index?.[1]?.unique).toBe(true);
  });
  it("prevents duplicate user/workspace/language drafts", () => {
    const index = PlaygroundDraftModel.schema
      .indexes()
      .find(
        ([fields]) =>
          fields.clerkUserId === 1 &&
          fields.workspace === 1 &&
          fields.language === 1,
      );
    expect(index?.[1]?.unique).toBe(true);
  });
  it("extends draft storage without removing Python or JavaScript fields", () => {
    expect(ChallengePracticeModel.schema.path("drafts.python")).toBeTruthy();
    expect(
      ChallengePracticeModel.schema.path("drafts.javascript"),
    ).toBeTruthy();
    expect(ChallengePracticeModel.schema.path("drafts.sql")).toBeTruthy();
  });
});
