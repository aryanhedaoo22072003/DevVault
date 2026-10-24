import { auth } from "@clerk/nextjs/server";
import {
  Bookmark,
  CheckCircle2,
  CircleDashed,
  Code2,
  Eye,
  Search,
} from "lucide-react";
import Link from "next/link";
import { VioletEclipseBackground } from "@/components/violet-eclipse-background";
import { ChallengeBookmark } from "@/components/challenge-bookmark";
import { Navbar } from "@/components/navbar";
import { connectToDatabase } from "@/lib/db";
import {
  resolveChallengePracticeStatus,
  practiceSummary,
  type PracticeProgress,
} from "@/lib/practice";
import { ChallengePracticeModel } from "@/models/challenge-practice.model";
import { ChallengeSubmissionModel } from "@/models/challenge-submission.model";
import { CodingChallengeModel } from "@/models/coding-challenge.model";

const safe = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const statusLabel: Record<PracticeProgress, string> = {
  "not-started": "Not Started",
  viewed: "Viewed",
  "in-progress": "In Progress",
  "practice-passed": "Practice Passed · Unverified",
  "official-solved": "Official Solved",
};
export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    difficulty?: string;
    topic?: string;
    progress?: string;
    bookmarked?: string;
    sort?: string;
  }>;
}) {
  const query = await searchParams;
  const { userId } = await auth();
  await connectToDatabase();
  const challengeFilter: Record<string, unknown> = { status: "published" };
  if (query.q?.trim())
    challengeFilter.title = { $regex: safe(query.q.trim()), $options: "i" };
  if (["easy", "medium", "hard"].includes(query.difficulty ?? ""))
    challengeFilter.difficulty = query.difficulty;
  if (query.topic) challengeFilter.topic = query.topic;
  const [allChallenges, filteredChallenges, topics, states, acceptedIds] =
    await Promise.all([
      CodingChallengeModel.find({ status: "published" }).select("_id").lean(),
      CodingChallengeModel.find(challengeFilter)
        .select("-privateTestCases")
        .lean(),
      CodingChallengeModel.distinct("topic", { status: "published" }),
      userId ? ChallengePracticeModel.find({ clerkUserId: userId }).lean() : [],
      userId
        ? ChallengeSubmissionModel.distinct("challengeId", {
            clerkUserId: userId,
            status: "accepted",
          })
        : [],
    ]);
  const stateById = new Map(
    states.map((state) => [String(state.challengeId), state]),
  );
  const solvedIds = new Set(acceptedIds.map(String));
  const allRows = allChallenges.map((challenge) => {
    const state = stateById.get(String(challenge._id));
    return {
      progress: resolveChallengePracticeStatus(
        state,
        solvedIds.has(String(challenge._id)),
      ),
      bookmarked: Boolean(state?.bookmarked),
    };
  });
  const summary = practiceSummary(allRows, allChallenges.length);
  let rows = filteredChallenges.map((challenge) => {
    const state = stateById.get(String(challenge._id));
    return {
      challenge,
      state,
      progress: resolveChallengePracticeStatus(
        state,
        solvedIds.has(String(challenge._id)),
      ),
    };
  });
  if (
    [
      "not-started",
      "viewed",
      "in-progress",
      "practice-passed",
      "official-solved",
    ].includes(query.progress ?? "")
  )
    rows = rows.filter((row) => row.progress === query.progress);
  if (query.bookmarked === "true")
    rows = rows.filter((row) => row.state?.bookmarked);
  const rank = { easy: 1, medium: 2, hard: 3 };
  rows.sort((a, b) =>
    query.sort === "title"
      ? a.challenge.title.localeCompare(b.challenge.title)
      : query.sort === "difficulty"
        ? rank[a.challenge.difficulty] - rank[b.challenge.difficulty]
        : new Date(b.challenge.publishedAt ?? b.challenge.createdAt).getTime() -
          new Date(a.challenge.publishedAt ?? a.challenge.createdAt).getTime(),
  );
  const cards = [
    { label: "Published challenges", value: summary.total, icon: Code2 },
    { label: "Viewed only", value: summary.viewed, icon: Eye },
    { label: "In progress", value: summary.inProgress, icon: CircleDashed },
    {
      label: "Practice Passed",
      value: summary.practicePassed,
      icon: CheckCircle2,
    },
    { label: "Official Solved", value: summary.solved, icon: CheckCircle2 },
    { label: "Bookmarked", value: summary.bookmarked, icon: Bookmark },
  ];
  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100">
      <VioletEclipseBackground />
      <Navbar />
      <div className="section-shell py-10 md:py-14">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-violet-300">
              Practice command center
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-white md:text-5xl">
              Build problem-solving momentum.
            </h1>
            <p className="mt-3 max-w-2xl text-slate-400">
              Save language-specific drafts, organize your challenge queue, and
              track only genuinely verified solutions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/practice/sql/challenges"
              className="rounded-full border border-amber-400/30 bg-amber-400/10 px-5 py-2.5 text-sm font-semibold text-amber-100"
            >
              SQL Challenges
            </Link>
            <Link href="/practice/sql" className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-slate-200">SQL Playground</Link>
            <Link
              href="/dashboard/practice"
              className="rounded-full bg-gradient-to-r from-violet-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Practice progress
            </Link>
            <Link
              href="/dashboard/submissions"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-slate-200"
            >
              Submissions
            </Link>
          </div>
        </header>
        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, icon: Icon }) => (
            <article key={label} className="aurora-card rounded-3xl p-5">
              <Icon className="h-5 w-5 text-violet-300" />
              <p className="mt-5 text-3xl font-semibold text-white">{value}</p>
              <p className="mt-1 text-sm text-slate-400">{label}</p>
            </article>
          ))}
        </section>
        {!userId ? (
          <div className="mt-6 rounded-2xl border border-violet-400/20 bg-violet-400/5 px-5 py-4 text-sm text-violet-100">
            Browse freely. Sign in to save bookmarks, drafts, and practice
            activity.
          </div>
        ) : null}
        <form className="aurora-panel mt-8 grid gap-3 rounded-3xl p-4 md:grid-cols-2 xl:grid-cols-[1.5fr_repeat(4,1fr)_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <span className="sr-only">Search by challenge title</span>
            <input
              name="q"
              defaultValue={query.q}
              placeholder="Search by title"
              className="admin-input pl-10"
            />
          </label>
          <select
            name="difficulty"
            defaultValue={query.difficulty ?? ""}
            aria-label="Difficulty"
            className="admin-input"
          >
            <option value="">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <select
            name="topic"
            defaultValue={query.topic ?? ""}
            aria-label="Topic"
            className="admin-input"
          >
            <option value="">All topics</option>
            {topics.sort().map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
          <select
            name="progress"
            defaultValue={query.progress ?? ""}
            aria-label="Progress"
            className="admin-input"
          >
            <option value="">All progress</option>
            <option value="not-started">Not Started</option>
            <option value="viewed">Viewed</option>
            <option value="in-progress">In Progress</option>
            <option value="practice-passed">
              Practice Passed (unverified)
            </option>
            <option value="official-solved">Official Solved</option>
          </select>
          <select
            name="sort"
            defaultValue={query.sort ?? "newest"}
            aria-label="Sort challenges"
            className="admin-input"
          >
            <option value="newest">Newest</option>
            <option value="title">Title</option>
            <option value="difficulty">Difficulty</option>
          </select>
          <button className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-500">
            Apply
          </button>
          <label className="flex items-center gap-2 px-2 text-sm text-slate-300 md:col-span-2 xl:col-span-6">
            <input
              type="checkbox"
              name="bookmarked"
              value="true"
              defaultChecked={query.bookmarked === "true"}
              className="h-4 w-4 accent-violet-500"
            />
            Bookmarked only
          </label>
        </form>
        {rows.length ? (
          <div className="aurora-panel mt-8 overflow-hidden rounded-3xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-white/10 bg-white/[.03] text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="p-4 md:p-5">Challenge</th>
                    <th className="p-4">Difficulty</th>
                    <th className="p-4">Topic</th>
                    <th className="p-4">Progress</th>
                    <th className="p-4 text-right">Save</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ challenge, state, progress }) => (
                    <tr
                      key={String(challenge._id)}
                      className="border-b border-white/10 last:border-0 hover:bg-violet-400/[.035]"
                    >
                      <td className="p-4 md:p-5">
                        <Link
                          href={`/practice/${challenge.slug}`}
                          className="font-semibold text-white hover:text-violet-200"
                        >
                          {challenge.title}
                        </Link>
                        <p className="mt-1 max-w-xl text-xs text-slate-500">
                          {challenge.summary}
                        </p>
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${challenge.difficulty === "easy" ? "bg-emerald-400/10 text-emerald-200" : challenge.difficulty === "medium" ? "bg-amber-400/10 text-amber-200" : "bg-rose-400/10 text-rose-200"}`}
                        >
                          {challenge.difficulty}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300">{challenge.topic}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${progress === "official-solved" ? "text-emerald-300" : progress === "practice-passed" ? "text-amber-200" : progress === "in-progress" ? "text-violet-300" : "text-slate-500"}`}
                        >
                          {progress === "official-solved" ||
                          progress === "practice-passed" ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <CircleDashed className="h-4 w-4" />
                          )}
                          {statusLabel[progress]}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <ChallengeBookmark
                          slug={challenge.slug}
                          initialBookmarked={Boolean(state?.bookmarked)}
                          signedIn={Boolean(userId)}
                          compact
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="aurora-card mt-8 rounded-3xl p-10 text-center">
            <CircleDashed className="mx-auto h-8 w-8 text-violet-300" />
            <h2 className="mt-4 text-xl font-semibold text-white">
              No challenges match this view
            </h2>
            <p className="mt-2 text-slate-400">
              Clear a filter or try a different title.
            </p>
            <Link
              href="/practice"
              className="mt-5 inline-flex rounded-full border border-violet-400/30 px-5 py-2 text-sm text-violet-200"
            >
              Clear filters
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
