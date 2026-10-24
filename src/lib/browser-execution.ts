export const BROWSER_RUNNER_CHANNEL = 'devvault-browser-runner' as const;
export const BROWSER_RUNNER_VERSION = 1 as const;
export const MAX_BROWSER_SOURCE_BYTES = 30_000;
export const MAX_BROWSER_OUTPUT_BYTES = 16_384;
export const BROWSER_EXECUTION_TIMEOUT_MS = 10_000;

export type BrowserLanguage = 'python' | 'javascript' | 'sql';
export type PlaygroundLanguage = BrowserLanguage | 'typescript' | 'c' | 'cpp' | 'java';
export type PublicTest = { input: string; expectedOutput: string };

export type BrowserRunRequest = {
  channel: typeof BROWSER_RUNNER_CHANNEL;
  version: typeof BROWSER_RUNNER_VERSION;
  id: string;
  action: 'run';
  language: BrowserLanguage;
  code: string;
  entrypoint?: string;
  tests?: PublicTest[];
  dataset?: string[];
};

export type BrowserRunResult = {
  channel: typeof BROWSER_RUNNER_CHANNEL;
  version: typeof BROWSER_RUNNER_VERSION;
  id: string;
  type: 'result';
  ok: boolean;
  stdout: string;
  stderr: string;
  tests: Array<{ passed: boolean; actual: string }>;
  columns?: string[];
  rows?: unknown[][];
  truncated?: boolean;
};

export const languageRegistry: Record<PlaygroundLanguage, { label: string; monaco: string; runnable: boolean; status: string }> = {
  python: { label: 'Python', monaco: 'python', runnable: true, status: 'Runs locally with Pyodide' },
  javascript: { label: 'JavaScript', monaco: 'javascript', runnable: true, status: 'Runs in an opaque-origin sandbox' },
  sql: { label: 'SQL', monaco: 'sql', runnable: true, status: 'Runs against disposable SQLite data' },
  typescript: { label: 'TypeScript', monaco: 'typescript', runnable: false, status: 'Execution not available' },
  c: { label: 'C', monaco: 'c', runnable: false, status: 'Execution not available' },
  cpp: { label: 'C++', monaco: 'cpp', runnable: false, status: 'Execution not available' },
  java: { label: 'Java', monaco: 'java', runnable: false, status: 'Execution not available' },
};

export function validRunnerRequest(value: unknown): value is BrowserRunRequest {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<BrowserRunRequest>;
  if (item.channel !== BROWSER_RUNNER_CHANNEL || item.version !== BROWSER_RUNNER_VERSION || item.action !== 'run') return false;
  if (!item.id || item.id.length > 100 || !/^[a-zA-Z0-9-]+$/.test(item.id)) return false;
  if (!item.language || !['python', 'javascript', 'sql'].includes(item.language)) return false;
  if (typeof item.code !== 'string' || new TextEncoder().encode(item.code).byteLength > MAX_BROWSER_SOURCE_BYTES) return false;
  if (item.entrypoint !== undefined && !/^[A-Za-z_$][A-Za-z0-9_$]{0,99}$/.test(item.entrypoint)) return false;
  if (item.tests && (item.tests.length > 20 || item.tests.some((test) => typeof test.input !== 'string' || typeof test.expectedOutput !== 'string' || test.input.length > 4_000 || test.expectedOutput.length > 4_000))) return false;
  if (item.dataset && (item.dataset.length > 50 || item.dataset.some((statement) => typeof statement !== 'string' || statement.length > 10_000))) return false;
  return true;
}

export function validRunnerResult(value: unknown, expectedId: string): value is BrowserRunResult {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<BrowserRunResult>;
  return item.channel === BROWSER_RUNNER_CHANNEL && item.version === BROWSER_RUNNER_VERSION && item.id === expectedId && item.type === 'result' && typeof item.ok === 'boolean' && typeof item.stdout === 'string' && typeof item.stderr === 'string' && Array.isArray(item.tests) && item.stdout.length <= MAX_BROWSER_OUTPUT_BYTES + 100 && item.stderr.length <= MAX_BROWSER_OUTPUT_BYTES + 100;
}
