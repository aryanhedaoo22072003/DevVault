import {
  Award,
  BookOpen,
  CheckCircle2,
  Code2,
  Compass,
  FileCode2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { VioletEclipseBackground } from "@/components/violet-eclipse-background";
import { Navbar } from "@/components/navbar";
import { isOwnerClerkUserId, requireAuthenticatedUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import {
  buildPaidLearningAccessFilter,
  canOpenLearningPath,
} from "@/lib/learning";
import { ACHIEVEMENTS } from "@/lib/learning-progress";
import { resolveChallengePracticeStatus } from "@/lib/practice";
import { orderedSections, trackProgress } from "@/lib/practice-tracks";
import {
  aggregateXp,
  buildDashboardActivities,
  nextUnfinishedItem,
  ownerFilter,
  uniqueKnowledgeChecks,
  type DashboardActivity,
} from "@/lib/student-dashboard";
import { ChallengePracticeModel } from "@/models/challenge-practice.model";
import { ChallengeSubmissionModel } from "@/models/challenge-submission.model";
import { CodingChallengeModel } from "@/models/coding-challenge.model";
import { LearningPathModel } from "@/models/learning-content.model";
import { StudentLearningProgressModel } from "@/models/learning-progress.model";
import { OrderModel } from "@/models/order.model";
import { PracticeTrackProgressModel } from "@/models/practice-track-progress.model";
import {
  PracticeTrackModel,
  PracticeTrackSectionModel,
} from "@/models/practice-track.model";

const trackOrder = [
  "python-problem-solving",
  "javascript-problem-solving",
  "sql-problem-solving",
  "dsa-interview-preparation",
  "data-engineering-fundamentals",
];
const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);

export default async function DashboardPage() {
  const session = await requireAuthenticatedUser();
  await connectToDatabase();
  const owner = ownerFilter(session.userId);
  const [
    learningProgress,
    tracks,
    trackProgresses,
    challengeStates,
    publishedChallenges,
    acceptedSubmissions,
  ] = await Promise.all([
    StudentLearningProgressModel.findOne(owner).lean(),
    PracticeTrackModel.find({ status: "published" })
      .select("title slug difficulty")
      .lean(),
    PracticeTrackProgressModel.find(owner).sort({ lastVisitedAt: -1 }).lean(),
    ChallengePracticeModel.find(owner).sort({ updatedAt: -1 }).lean(),
    CodingChallengeModel.find({ status: "published" })
      .select("_id title slug")
      .lean(),
    ChallengeSubmissionModel.find({ ...owner, status: "accepted" })
      .select("challengeId challengeSlug challengeTitle updatedAt")
      .sort({ updatedAt: -1 })
      .lean(),
  ]);
  const sortedTracks = [...tracks].sort((a, b) => {
    const left = trackOrder.indexOf(a.slug);
    const right = trackOrder.indexOf(b.slug);
    return (
      (left < 0 ? 99 : left) - (right < 0 ? 99 : right) ||
      a.title.localeCompare(b.title)
    );
  });
  const sections = orderedSections(
    await PracticeTrackSectionModel.find({
      trackId: { $in: sortedTracks.map((track) => track._id) },
      status: "published",
    })
      .select("trackId slug title order quiz.id")
      .lean(),
  );
  const progressByTrack = new Map(
    trackProgresses.map((progress) => [String(progress.trackId), progress]),
  );
  const challengeById = new Map(
    publishedChallenges.map((challenge) => [String(challenge._id), challenge]),
  );
  const solvedIds = new Set(
    acceptedSubmissions
      .map((submission) => String(submission.challengeId))
      .filter((id) => challengeById.has(id)),
  );
  const codingStatuses = challengeStates
    .filter((state) => challengeById.has(String(state.challengeId)))
    .map((state) =>
      resolveChallengePracticeStatus(
        state,
        solvedIds.has(String(state.challengeId)),
      ),
    );
  const codingStatusCounts = {
    viewed: codingStatuses.filter((status) => status === "viewed").length,
    inProgress: codingStatuses.filter((status) => status === "in-progress")
      .length,
    practicePassed: codingStatuses.filter(
      (status) => status === "practice-passed",
    ).length,
    officialSolved: codingStatuses.filter(
      (status) => status === "official-solved",
    ).length,
  };

  const enrolledPaths = await LearningPathModel.find({
    _id: {
      $in: learningProgress?.enrollments.map((entry) => entry.pathId) ?? [],
    },
    status: "published",
  }).lean();
  const visiblePaths = (
    await Promise.all(
      enrolledPaths.map(async (path) => {
        const ownsPaid =
          path.access === "paid" && path.productId
            ? Boolean(
                await OrderModel.exists(
                  buildPaidLearningAccessFilter(session.userId, path.productId),
                ),
              )
            : false;
        return canOpenLearningPath(path.access, session.userId, ownsPaid)
          ? path
          : null;
      }),
    )
  ).filter((path): path is NonNullable<typeof path> => Boolean(path));
  const completedLessonIds = new Set(
    learningProgress?.completedLessons.map((entry) => entry.lessonId) ?? [],
  );
  const latestEnrollment = [...(learningProgress?.enrollments ?? [])]
    .filter((entry) =>
      visiblePaths.some((path) => String(path._id) === String(entry.pathId)),
    )
    .sort((a, b) => b.lastVisitedAt.getTime() - a.lastVisitedAt.getTime())[0];
  const latestPath = latestEnrollment
    ? visiblePaths.find(
        (path) => String(path._id) === String(latestEnrollment.pathId),
      )
    : undefined;
  const courseLessons =
    latestPath?.modules
      .sort((a, b) => a.order - b.order)
      .flatMap((module) =>
        module.lessons
          .filter((lesson) => lesson.status === "published")
          .sort((a, b) => a.order - b.order)
          .map((lesson, index) => ({
            id: String(lesson._id),
            slug: lesson.slug,
            order: module.order * 1000 + index,
          })),
      ) ?? [];
  const nextLesson = nextUnfinishedItem(
    courseLessons,
    completedLessonIds,
    latestEnrollment?.lastVisitedLessonId,
  );

  const latestTrackProgress = trackProgresses.find((progress) =>
    sortedTracks.some(
      (track) => String(track._id) === String(progress.trackId),
    ),
  );
  const latestTrack = latestTrackProgress
    ? sortedTracks.find(
        (track) => String(track._id) === String(latestTrackProgress.trackId),
      )
    : undefined;
  const latestTrackSections = latestTrack
    ? sections.filter(
        (section) => String(section.trackId) === String(latestTrack._id),
      )
    : [];
  const lastTrackSection = latestTrackSections.find(
    (section) => String(section._id) === latestTrackProgress?.lastSectionId,
  );
  const nextSection = nextUnfinishedItem(
    latestTrackSections.map((section) => ({
      id: section.quiz.id,
      slug: section.slug,
      order: section.order,
    })),
    latestTrackProgress?.completedQuizIds ?? [],
    lastTrackSection?.quiz.id,
  );
  const draftRecommendations = challengeStates
    .flatMap((state) => {
      const challenge = challengeById.get(String(state.challengeId));
      if (!challenge) return [];
      return (["python", "javascript"] as const).flatMap((language) =>
        state.drafts?.[language]
          ? [
              {
                challenge,
                language,
                updatedAt: state.drafts[language]!.updatedAt,
              },
            ]
          : [],
      );
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 3);

  const xp = aggregateXp(learningProgress);
  const passedKnowledgeChecks = uniqueKnowledgeChecks(
    trackProgresses,
    sections.map((section) => section.quiz.id),
  );
  const earnedKeys = new Set(
    learningProgress?.achievements.map((achievement) => achievement.key) ?? [],
  );
  const badges = Object.entries(ACHIEVEMENTS).map(([key, definition]) => ({
    key,
    ...definition,
    earned: earnedKeys.has(key as keyof typeof ACHIEVEMENTS),
  }));
  const learningActivities: DashboardActivity[] = [
    ...(learningProgress?.completedLessons.map((item) => ({
      key: `lesson-${item.lessonId}`,
      kind: "lesson" as const,
      title: "Lesson completed",
      description: item.lessonSlug.replaceAll("-", " "),
      href: `/learn/${item.pathSlug}?lesson=${item.lessonSlug}`,
      occurredAt: item.completedAt,
    })) ?? []),
    ...(learningProgress?.achievements.map((item) => ({
      key: `badge-${item.key}`,
      kind: "badge" as const,
      title: `Badge earned: ${item.title}`,
      description: `Awarded ${item.xp} XP`,
      href: "/dashboard/learning",
      occurredAt: item.earnedAt,
    })) ?? []),
  ];
  const trackActivities: DashboardActivity[] = trackProgresses.flatMap(
    (progress) => {
      const track = sortedTracks.find(
        (item) => String(item._id) === String(progress.trackId),
      );
      if (!track) return [];
      const visit =
        progress.lastVisitedAt && progress.lastSectionId
          ? sections.find(
              (section) => String(section._id) === progress.lastSectionId,
            )
          : null;
      return [
        ...progress.quizAttempts
          .filter((attempt) => attempt.passed)
          .map((attempt) => ({
            key: `quiz-${String(progress._id)}-${attempt.quizId}-${attempt.attemptedAt.toISOString()}`,
            kind: "knowledge-check" as const,
            title: "Knowledge check passed",
            description: `${track.title} · ${attempt.percentage}%`,
            href: `/practice/tracks/${track.slug}?section=${sections.find((section) => section.quiz.id === attempt.quizId)?.slug ?? ""}`,
            occurredAt: attempt.attemptedAt,
          })),
        ...(visit
          ? [
              {
                key: `visit-${String(progress._id)}-${progress.lastVisitedAt?.toISOString()}`,
                kind: "track-visit" as const,
                title: "Practice section visited",
                description: `${track.title} · ${visit.title}`,
                href: `/practice/tracks/${track.slug}?section=${visit.slug}`,
                occurredAt: progress.lastVisitedAt!,
              },
            ]
          : []),
      ];
    },
  );
  const draftActivities: DashboardActivity[] = draftRecommendations.map(
    (item) => ({
      key: `draft-${String(item.challenge._id)}-${item.language}`,
      kind: "draft",
      title: "Coding draft saved",
      description: `${item.challenge.title} · ${item.language}`,
      href: `/practice/${item.challenge.slug}`,
      occurredAt: item.updatedAt,
    }),
  );
  const challengeActivities: DashboardActivity[] = acceptedSubmissions.map(
    (item) => ({
      key: `accepted-${String(item._id)}`,
      kind: "challenge",
      title: "Coding problem solved",
      description: item.challengeTitle,
      href: `/practice/${item.challengeSlug}`,
      occurredAt: item.updatedAt,
    }),
  );
  const activities = buildDashboardActivities(
    [learningActivities, trackActivities, draftActivities, challengeActivities],
    9,
  );
  const firstName =
    session.user.firstName ??
    session.profile?.name?.split(" ")[0] ??
    "Developer";
  const isOwner = isOwnerClerkUserId(session.userId);
  const metricCards = [
    { label: "Total earned XP", value: xp.total, icon: Sparkles },
    { label: "Unlocked badges", value: earnedKeys.size, icon: Award },
    {
      label: "Learning paths started",
      value: visiblePaths.length,
      icon: BookOpen,
    },
    {
      label: "Knowledge checks passed",
      value: passedKnowledgeChecks,
      icon: CheckCircle2,
    },
    { label: "Verified problems solved", value: solvedIds.size, icon: Code2 },
  ];

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100">
      <VioletEclipseBackground />
      <Navbar />
      <div className="section-shell py-8 md:py-12 2xl:max-w-[1440px]">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-violet-300">
              Student command center
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-white md:text-5xl">
              Welcome back, {firstName}.
            </h1>
            <p className="mt-3 max-w-2xl text-slate-400">
              One trusted view of your learning, knowledge checks, and verified
              coding progress.
            </p>
          </div>
          <nav
            aria-label="Dashboard shortcuts"
            className="flex flex-wrap gap-2"
          >
            {isOwner ? (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-400/10 px-5 py-2.5 text-sm font-semibold text-violet-100"
              >
                <ShieldCheck className="h-4 w-4" />
                Admin Dashboard
              </Link>
            ) : null}
            <Link
              href="/practice/tracks"
              className="rounded-full bg-gradient-to-r from-violet-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Explore tracks
            </Link>
            <Link
              href="/practice"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-slate-200"
            >
              Practice hub
            </Link>
          </nav>
        </header>
        <section
          aria-label="Learning overview"
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5"
        >
          {metricCards.map(({ label, value, icon: Icon }) => (
            <article
              key={label}
              className="aurora-card flex min-h-36 flex-col rounded-3xl p-5 md:p-6"
            >
              <Icon className="h-5 w-5 text-violet-300" />
              <p className="mt-auto pt-5 text-3xl font-semibold tabular-nums text-white">
                {value}
              </p>
              <p className="mt-1 text-sm leading-5 text-slate-400">{label}</p>
            </article>
          ))}
        </section>
        <section
          aria-label="Coding practice status"
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            { label: "Viewed", value: codingStatusCounts.viewed },
            { label: "In Progress", value: codingStatusCounts.inProgress },
            {
              label: "Practice Passed · Unverified",
              value: codingStatusCounts.practicePassed,
            },
            {
              label: "Official Solved",
              value: codingStatusCounts.officialSolved,
            },
          ].map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-white/10 bg-white/[.025] p-4"
            >
              <p className="text-2xl font-semibold text-white">{item.value}</p>
              <p className="mt-1 text-xs text-slate-400">{item.label}</p>
            </article>
          ))}
        </section>
        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">
            Personalized
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Continue learning
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {latestTrack && nextSection ? (
              <ContinueCard
                eyebrow="Practice track"
                title={latestTrack.title}
                detail={`Next: ${latestTrackSections.find((item) => item.slug === nextSection.slug)?.title ?? nextSection.slug}`}
                href={`/practice/tracks/${latestTrack.slug}?section=${nextSection.slug}`}
                icon={<Compass className="h-5 w-5" />}
              />
            ) : (
              <EmptyContinue
                title="No active practice track"
                detail="Visit a published track to begin knowledge-check progress."
                href="/practice/tracks"
                label="Browse tracks"
              />
            )}
            {latestPath && nextLesson ? (
              <ContinueCard
                eyebrow="Learning course"
                title={latestPath.title}
                detail={`Next lesson: ${latestPath.modules.flatMap((item) => item.lessons).find((item) => item.slug === nextLesson.slug)?.title ?? nextLesson.slug}`}
                href={`/learn/${latestPath.slug}?lesson=${nextLesson.slug}`}
                icon={<BookOpen className="h-5 w-5" />}
              />
            ) : (
              <EmptyContinue
                title="No unfinished course lesson"
                detail="Start a published path or revisit your learning library."
                href="/dashboard/learning"
                label="Open learning"
              />
            )}
            {draftRecommendations.length ? (
              <article className="aurora-card rounded-3xl p-5">
                <div className="flex items-center gap-2 text-violet-300">
                  <FileCode2 className="h-5 w-5" />
                  <p className="text-xs font-semibold uppercase tracking-wider">
                    Saved drafts
                  </p>
                </div>
                <div className="mt-4 space-y-2">
                  {draftRecommendations.map((item) => (
                    <Link
                      key={`${String(item.challenge._id)}-${item.language}`}
                      href={`/practice/${item.challenge.slug}`}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.025] p-3 text-sm hover:border-violet-400/30"
                    >
                      <span>
                        <span className="block font-semibold text-white">
                          {item.challenge.title}
                        </span>
                        <span className="text-xs capitalize text-slate-500">
                          {item.language} · {formatDate(item.updatedAt)}
                        </span>
                      </span>
                      <span className="text-violet-300">Continue →</span>
                    </Link>
                  ))}
                </div>
              </article>
            ) : (
              <EmptyContinue
                title="No saved coding drafts"
                detail="Open a challenge and your authenticated drafts will appear here."
                href="/practice"
                label="Choose a challenge"
              />
            )}
          </div>
        </section>
        <TrackGrid
          tracks={sortedTracks}
          sections={sections}
          progressByTrack={progressByTrack}
        />
        <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
          <ActivityFeed activities={activities} />
          <div className="space-y-6">
            <XpBreakdown
              xp={xp}
              passedKnowledgeChecks={passedKnowledgeChecks}
            />
            <section className="aurora-panel rounded-3xl p-5 md:p-6">
              <h2 className="text-xl font-semibold text-white">Achievements</h2>
              <div className="mt-4 space-y-3">
                {badges.map((badge) => (
                  <div
                    key={badge.key}
                    className={`rounded-2xl border p-4 ${badge.earned ? "border-violet-400/20 bg-violet-400/5" : "border-white/10 bg-white/[.02]"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={
                          badge.earned
                            ? "font-semibold text-violet-100"
                            : "font-semibold text-slate-400"
                        }
                      >
                        {badge.title}
                      </span>
                      <span
                        className={`text-xs font-semibold ${badge.earned ? "text-violet-300" : "text-slate-600"}`}
                      >
                        {badge.earned ? "Unlocked" : "Locked"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {badge.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
        <nav
          aria-label="Student resources"
          className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            { label: "Practice tracks", href: "/practice/tracks" },
            { label: "Practice hub", href: "/practice" },
            { label: "Learning dashboard", href: "/dashboard/learning" },
            { label: "My purchases", href: "/dashboard/purchases" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-white/10 bg-white/[.035] p-4 text-center text-sm font-semibold text-slate-200 hover:border-violet-400/30 hover:text-violet-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}

type TrackRow = {
  _id: unknown;
  title: string;
  slug: string;
  difficulty: string;
};
type SectionRow = {
  _id: unknown;
  trackId: unknown;
  slug: string;
  title: string;
  order: number;
  quiz: { id: string };
};
type ProgressRow = {
  trackId: unknown;
  completedQuizIds: string[];
  lastSectionId?: string;
};

function TrackGrid({
  tracks,
  sections,
  progressByTrack,
}: {
  tracks: TrackRow[];
  sections: SectionRow[];
  progressByTrack: Map<string, ProgressRow>;
}) {
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">
            Five-track roadmap
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Practice track progress
          </h2>
        </div>
        <Link
          href="/dashboard/practice"
          className="text-sm font-semibold text-violet-300"
        >
          Coding progress →
        </Link>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {tracks.map((track) => {
          const trackSections = sections.filter(
            (section) => String(section.trackId) === String(track._id),
          );
          const progress = progressByTrack.get(String(track._id));
          const knowledge = trackProgress(
            progress?.completedQuizIds ?? [],
            trackSections.map((section) => section.quiz.id),
          );
          const last = trackSections.find(
            (section) => String(section._id) === progress?.lastSectionId,
          );
          const next = nextUnfinishedItem(
            trackSections.map((section) => ({
              id: section.quiz.id,
              slug: section.slug,
              order: section.order,
            })),
            progress?.completedQuizIds ?? [],
            last?.quiz.id,
          );
          const target = next ?? trackSections[0];
          return (
            <article
              key={String(track._id)}
              className="aurora-card flex min-h-60 flex-col rounded-3xl p-5"
            >
              <span className="text-xs font-semibold capitalize text-violet-300">
                {track.difficulty}
              </span>
              <h3 className="mt-2 text-lg font-semibold leading-6 text-white">
                {track.title}
              </h3>
              <div className="mt-5 flex justify-between text-xs text-slate-400">
                <span>
                  {knowledge.completed}/{knowledge.total} checks
                </span>
                <span>{knowledge.percentage}%</span>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-label={`${track.title} progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={knowledge.percentage}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-400"
                  style={{ width: `${knowledge.percentage}%` }}
                />
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                {last ? `Last visited: ${last.title}` : "Not started yet"}
              </p>
              <Link
                href={`/practice/tracks/${track.slug}${target ? `?section=${target.slug}` : ""}`}
                className="mt-auto pt-5 text-sm font-semibold text-violet-300"
              >
                {knowledge.percentage === 100 ? "Review track" : "Continue"} →
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
function ActivityFeed({ activities }: { activities: DashboardActivity[] }) {
  return (
    <section className="aurora-panel rounded-3xl p-5 md:p-6">
      <h2 className="text-xl font-semibold text-white">Recent activity</h2>
      <p className="mt-1 text-sm text-slate-500">
        Only events with stored timestamps are shown.
      </p>
      {activities.length ? (
        <div className="mt-5 space-y-2">
          {activities.map((activity) => (
            <Link
              key={activity.key}
              href={activity.href}
              className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-4 hover:border-violet-400/30"
            >
              <div>
                <p className="font-semibold text-white">{activity.title}</p>
                <p className="mt-1 text-xs capitalize text-slate-500">
                  {activity.description}
                </p>
              </div>
              <time
                className="shrink-0 text-xs text-slate-500"
                dateTime={activity.occurredAt.toISOString()}
              >
                {formatDate(activity.occurredAt)}
              </time>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-8 text-center">
          <p className="font-semibold text-white">
            Your activity feed is ready
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Completed lessons, passed checks, badges, track visits, and saved
            drafts will appear here.
          </p>
        </div>
      )}
    </section>
  );
}
function XpBreakdown({
  xp,
  passedKnowledgeChecks,
}: {
  xp: ReturnType<typeof aggregateXp>;
  passedKnowledgeChecks: number;
}) {
  const items = [
    { label: "Learning achievement awards", value: xp.learning },
    {
      label: "Ledger-backed knowledge-check awards",
      value: xp.knowledgeChecks,
    },
    { label: "Verified coding awards", value: xp.coding },
    ...(xp.unattributedHistorical
      ? [
          {
            label: "Historical XP — source not recorded",
            value: xp.unattributedHistorical,
          },
        ]
      : []),
  ];
  return (
    <section className="aurora-panel rounded-3xl p-5 md:p-6">
      <h2 className="text-xl font-semibold text-white">XP attribution</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        Your total balance is authoritative. Categories include only explicit
        award-ledger records.
      </p>
      {passedKnowledgeChecks > 0 && xp.knowledgeChecks === 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[.06] p-3 text-xs leading-5 text-amber-100">
          <strong>
            {passedKnowledgeChecks} knowledge checks are recorded as passed.
          </strong>{" "}
          Their historical XP has no quiz-award ledger entries, so those points
          are not inferred here.
        </div>
      ) : null}
      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span className="min-w-0 text-slate-300">{item.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-violet-300">
                {item.value} XP
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-400"
                style={{
                  width: `${xp.total ? Math.round((item.value / xp.total) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
function ContinueCard({
  eyebrow,
  title,
  detail,
  href,
  icon,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  href: string;
  icon: ReactNode;
}) {
  return (
    <article className="aurora-card flex min-h-56 flex-col rounded-3xl p-5">
      <div className="flex items-center gap-2 text-violet-300">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wider">
          {eyebrow}
        </p>
      </div>
      <h3 className="mt-5 text-xl font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
      <Link
        href={href}
        className="mt-auto pt-6 text-sm font-semibold text-violet-300"
      >
        Continue →
      </Link>
    </article>
  );
}
function EmptyContinue({
  title,
  detail,
  href,
  label,
}: {
  title: string;
  detail: string;
  href: string;
  label: string;
}) {
  return (
    <article className="rounded-3xl border border-dashed border-white/10 bg-slate-900/40 p-5">
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
      <Link
        href={href}
        className="mt-5 inline-flex text-sm font-semibold text-violet-300"
      >
        {label} →
      </Link>
    </article>
  );
}
