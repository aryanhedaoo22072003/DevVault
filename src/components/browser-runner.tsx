"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, Play, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  BROWSER_EXECUTION_TIMEOUT_MS,
  BROWSER_RUNNER_CHANNEL,
  BROWSER_RUNNER_VERSION,
  type BrowserLanguage,
  type BrowserRunRequest,
  type BrowserRunResult,
  type PublicTest,
  validRunnerResult,
} from "@/lib/browser-execution";

export function useBrowserRunner() {
  const frame = useRef<HTMLIFrameElement>(null);
  const pending = useRef<{
    id: string;
    resolve: (result: BrowserRunResult) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const resetSandbox = useCallback(() => {
    setReady(false);
    if (frame.current)
      frame.current.src = `/devvault-browser-runner.html?generation=${Date.now()}`;
  }, []);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== "null" ||
        !event.data ||
        event.data.channel !== BROWSER_RUNNER_CHANNEL
      )
        return;
      if (
        event.data.type === "ready" &&
        event.data.version === BROWSER_RUNNER_VERSION
      ) {
        setReady(true);
        return;
      }
      const active = pending.current;
      if (!active || !validRunnerResult(event.data, active.id)) return;
      clearTimeout(active.timer);
      pending.current = null;
      active.resolve(event.data);
    };
    window.addEventListener("message", receive);
    return () => {
      window.removeEventListener("message", receive);
      if (pending.current) clearTimeout(pending.current.timer);
    };
  }, []);

  const stop = useCallback(() => {
    const active = pending.current;
    if (!active) return;
    clearTimeout(active.timer);
    pending.current = null;
    resetSandbox();
    active.reject(
      new Error(
        "Execution stopped. The isolated sandbox was reset and your code was preserved.",
      ),
    );
  }, [resetSandbox]);

  const run = useCallback(
    (input: Omit<BrowserRunRequest, "channel" | "version" | "id" | "action">) =>
      new Promise<BrowserRunResult>((resolve, reject) => {
        if (!ready || !frame.current?.contentWindow) {
          reject(new Error("The isolated browser runner is not ready."));
          return;
        }
        if (pending.current) {
          reject(new Error("Another local run is already active."));
          return;
        }
        const id = crypto.randomUUID();
        const timer = setTimeout(() => {
          pending.current = null;
          resetSandbox();
          reject(
            new Error(
              "Local execution exceeded the 10 second limit. The sandbox was reset and your code was preserved.",
            ),
          );
        }, BROWSER_EXECUTION_TIMEOUT_MS);
        pending.current = { id, resolve, reject, timer };
        frame.current.contentWindow.postMessage(
          {
            channel: BROWSER_RUNNER_CHANNEL,
            version: BROWSER_RUNNER_VERSION,
            id,
            action: "run",
            ...input,
          },
          "*",
        );
      }),
    [ready, resetSandbox],
  );

  const wake = useCallback(
    () =>
      frame.current?.contentWindow?.postMessage(
        {
          channel: BROWSER_RUNNER_CHANNEL,
          version: BROWSER_RUNNER_VERSION,
          action: "ping",
        },
        "*",
      ),
    [],
  );
  return {
    frame,
    ready,
    run,
    stop,
    wake,
    running: () => Boolean(pending.current),
  };
}

export function RunnerFrame({
  frameRef,
  onLoad,
}: {
  frameRef: React.RefObject<HTMLIFrameElement | null>;
  onLoad?: () => void;
}) {
  return (
    <iframe
      ref={frameRef}
      onLoad={onLoad}
      title="Isolated DevVault browser runner"
      src="/devvault-browser-runner.html"
      sandbox="allow-scripts"
      className="hidden"
      tabIndex={-1}
      aria-hidden="true"
    />
  );
}

async function hashSource(source: string) {
  const value = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(source),
  );
  return Array.from(new Uint8Array(value), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function LocalRunControls({
  language,
  code,
  entrypoint,
  tests = [],
  challengeSlug,
  signedIn,
  passedCodeHash,
}: {
  language: BrowserLanguage;
  code: string;
  entrypoint?: string;
  tests?: PublicTest[];
  challengeSlug?: string;
  signedIn?: boolean;
  passedCodeHash?: string;
}) {
  const runner = useBrowserRunner();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BrowserRunResult | null>(null);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [currentHash, setCurrentHash] = useState("");
  const [lastPassedHash, setLastPassedHash] = useState(passedCodeHash ?? "");
  useEffect(() => {
    let active = true;
    void hashSource(code).then((hash) => {
      if (active) setCurrentHash(hash);
    });
    return () => {
      active = false;
    };
  }, [code]);
  async function execute() {
    setBusy(true);
    setError("");
    setHistoryError("");
    setResult(null);
    try {
      if (signedIn && challengeSlug && language !== "sql")
        void fetch(`/api/practice/state/${encodeURIComponent(challengeSlug)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "attempt", language }),
        });
      const nextResult = await runner.run({
        language,
        code,
        entrypoint,
        tests,
      });
      setResult(nextResult);
      if (signedIn && challengeSlug && language !== "sql") {
        const response = await fetch("/api/practice/local-runs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challengeSlug,
            language,
            code,
            testResults: tests.map(
              (_, index) => nextResult.tests[index]?.passed === true,
            ),
            executionOk: nextResult.ok,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok)
          setHistoryError(data.error ?? "Local result could not be saved.");
        else {
          if (data.outcome === "passed")
            setLastPassedHash(await hashSource(code));
          router.refresh();
        }
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Local execution failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  function stop() {
    runner.stop();
    setBusy(false);
  }
  return (
    <div className="border-t border-white/10 p-4">
      <RunnerFrame frameRef={runner.frame} onLoad={runner.wake} />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={execute}
          disabled={!runner.ready || busy}
          className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white enabled:hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Run Locally
        </button>
        <button
          type="button"
          onClick={stop}
          disabled={!busy}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 disabled:opacity-40"
        >
          <Square className="h-3.5 w-3.5" />
          Stop
        </button>
        <span className="text-xs text-amber-200">
          Local Practice — Unverified · 0 XP
        </span>
      </div>
      {!runner.ready ? (
        <p className="mt-3 text-sm text-slate-400">
          Preparing the isolated browser sandbox…
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200"
        >
          {error}
        </p>
      ) : null}
      {lastPassedHash && currentHash && lastPassedHash !== currentHash ? (
        <p
          role="status"
          className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[.06] p-3 text-sm text-amber-100"
        >
          Previously passed public examples — current draft not rechecked.
        </p>
      ) : null}
      {historyError ? (
        <p role="alert" className="mt-3 text-sm text-amber-200">
          {historyError} Your editor draft is unchanged.
        </p>
      ) : null}
      {result ? (
        <RunnerResult
          key={`${result.ok}-${result.stdout}-${result.stderr}`}
          result={result}
          tests={tests}
        />
      ) : null}
    </div>
  );
}

export function RunnerResult({
  result,
  tests = [],
}: {
  result: BrowserRunResult;
  tests?: PublicTest[];
}) {
  const [tab, setTab] = useState<"output" | "errors" | "tests">(
    result.stderr ? "errors" : result.tests.length ? "tests" : "output",
  );
  const passed = result.tests.filter((test) => test.passed).length;
  const total = tests.length || result.tests.length;
  return (
    <div className="mt-4">
      <div
        className={`mb-3 rounded-xl border p-3 text-sm ${result.ok && result.tests.length > 0 && passed === result.tests.length ? "border-emerald-400/20 bg-emerald-400/[.06] text-emerald-100" : "border-amber-300/20 bg-amber-300/[.06] text-amber-100"}`}
      >
        <strong>
          {passed} of {total} public tests passed.
        </strong>{" "}
        <span className="opacity-80">
          Local practice only · unverified · 0 XP
        </span>
      </div>
      <div
        role="tablist"
        aria-label="Local execution results"
        className="flex gap-1 border-b border-white/10"
      >
        {(["output", "errors", "tests"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            onClick={() => setTab(item)}
            className={`px-3 py-2 text-xs font-semibold capitalize ${tab === item ? "border-b-2 border-violet-400 text-violet-200" : "text-slate-400"}`}
          >
            {item}
            {item === "tests" && total ? ` (${passed}/${total})` : ""}
          </button>
        ))}
      </div>
      <div className="rounded-b-xl border border-t-0 border-white/10 bg-[#0b0910] p-3">
        {tab === "output" ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Console Output
            </p>
            <pre className="max-h-44 overflow-auto whitespace-pre-wrap text-sm text-slate-200">
              {result.stdout || "No console output."}
            </pre>
          </div>
        ) : null}
        {tab === "errors" ? (
          <pre className="max-h-44 overflow-auto whitespace-pre-wrap text-sm text-rose-200">
            {result.stderr || "No syntax or runtime errors."}
          </pre>
        ) : null}
        {tab === "tests" ? (
          result.tests.length ? (
            <ul className="space-y-2 text-sm">
              {result.tests.map((test, index) => (
                <li
                  key={index}
                  className={`rounded-xl border p-3 ${test.passed ? "border-emerald-400/20 text-emerald-100" : "border-rose-400/20 text-rose-100"}`}
                >
                  <p className="font-semibold">
                    {test.passed ? "Passed" : "Failed"} · Public test{" "}
                    {index + 1}
                  </p>
                  <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-[90px_1fr]">
                    <dt className="text-slate-500">Input</dt>
                    <dd className="break-all font-mono">
                      {tests[index]?.input ?? "Unavailable"}
                    </dd>
                    <dt className="text-slate-500">Actual</dt>
                    <dd className="break-all font-mono">
                      {test.actual || "No returned value"}
                    </dd>
                    <dt className="text-slate-500">Expected</dt>
                    <dd className="break-all font-mono">
                      {tests[index]?.expectedOutput ?? "Unavailable"}
                    </dd>
                  </dl>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">
              {tests.length
                ? "Execution ended before individual public-test results were available."
                : "No public sample tests were provided."}
            </p>
          )
        ) : null}
        {result.truncated ? (
          <p className="mt-2 text-xs text-amber-200">Output was truncated.</p>
        ) : null}
      </div>
    </div>
  );
}
