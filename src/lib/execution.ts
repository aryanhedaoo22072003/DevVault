import { z } from 'zod';

import type { ChallengeLanguage } from '@/models/coding-challenge.model';

export const MAX_CODE_BYTES = 30_000;
export const MAX_OUTPUT_BYTES = 16_384;
export const CHALLENGE_XP = 100;

export const executionRequestSchema = z.object({
  challengeSlug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  language: z.enum(['python', 'javascript']),
  code: z.string().min(1).max(MAX_CODE_BYTES),
});

export type Judge0Config = {
  endpoint: string;
  authHeader?: string;
  authToken?: string;
  languageIds: Record<ChallengeLanguage, number>;
};

export function readJudge0Config(env: Record<string, string | undefined> = process.env): { config?: Judge0Config; reason?: string } {
  const endpoint = env.JUDGE0_ENDPOINT?.trim().replace(/\/$/, '');
  const python = Number(env.JUDGE0_PYTHON_LANGUAGE_ID);
  const javascript = Number(env.JUDGE0_JAVASCRIPT_LANGUAGE_ID);
  const authHeader = env.JUDGE0_AUTH_HEADER?.trim();
  const authToken = env.JUDGE0_AUTH_TOKEN?.trim();
  if (!endpoint) return { reason: 'The isolated execution service is not configured.' };
  let url: URL;
  try { url = new URL(endpoint); } catch { return { reason: 'The execution service endpoint is invalid.' }; }
  if (url.protocol !== 'https:') return { reason: 'The execution service must use HTTPS.' };
  if (!Number.isInteger(python) || python <= 0 || !Number.isInteger(javascript) || javascript <= 0) return { reason: 'Execution language mappings are incomplete.' };
  if (Boolean(authHeader) !== Boolean(authToken)) return { reason: 'Execution service authentication is incomplete.' };
  if (authHeader && !/^[A-Za-z0-9-]{1,100}$/.test(authHeader)) return { reason: 'Execution service authentication is invalid.' };
  return { config: { endpoint, authHeader, authToken, languageIds: { python, javascript } } };
}

export function parseTestInput(input: string): unknown[] {
  if (Buffer.byteLength(input, 'utf8') > 4_000) throw new Error('Test input exceeds the allowed size.');
  const parsed: unknown = JSON.parse(input);
  if (!Array.isArray(parsed)) throw new Error('Test input must be a JSON argument array.');
  return parsed;
}

function encodedInput(input: string) { return Buffer.from(input, 'utf8').toString('base64'); }

export function buildExecutionSource(language: ChallengeLanguage, source: string, entrypoint: string, input: string) {
  parseTestInput(input);
  if (!/^[A-Za-z_$][A-Za-z0-9_$]{0,99}$/.test(entrypoint)) throw new Error('Challenge entrypoint is invalid.');
  const encoded = encodedInput(input);
  if (language === 'python') return `${source}\n\nimport base64 as __dv_b64, json as __dv_json\n__dv_args = __dv_json.loads(__dv_b64.b64decode("${encoded}").decode("utf-8"))\n__dv_result = ${entrypoint}(*__dv_args)\nprint(__dv_json.dumps(__dv_result, separators=(",", ":"), ensure_ascii=False))\n`;
  const javascriptEntrypoint = entrypoint.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
  return `${source}\n\nconst __dvArgs = JSON.parse(Buffer.from("${encoded}", "base64").toString("utf8"));\nconst __dvResult = ${javascriptEntrypoint}(...__dvArgs);\nprocess.stdout.write(JSON.stringify(__dvResult));\n`;
}

function normalized(value: string) {
  const trimmed = value.trim();
  try { return JSON.stringify(JSON.parse(trimmed)); } catch { return trimmed.replace(/\r\n/g, '\n'); }
}

export function outputsMatch(actual: string, expected: string) { return normalized(actual) === normalized(expected); }

export function truncateOutput(value?: string | null) {
  if (!value) return '';
  return Buffer.byteLength(value, 'utf8') <= MAX_OUTPUT_BYTES ? value : `${Buffer.from(value).subarray(0, MAX_OUTPUT_BYTES).toString('utf8')}\n[output truncated]`;
}

export type ExecutionStatus = 'accepted' | 'wrong_answer' | 'compile_error' | 'runtime_error' | 'time_limit' | 'service_error';
export function classifyJudge0Status(id: number, description: string): Exclude<ExecutionStatus, 'wrong_answer'> {
  if (id === 3) return 'accepted';
  const label = description.toLowerCase();
  if (label.includes('compilation')) return 'compile_error';
  if (label.includes('time limit')) return 'time_limit';
  if (label.includes('runtime')) return 'runtime_error';
  return 'service_error';
}

export function executionRateKey(userId: string, action: 'run' | 'submit', now = new Date()) {
  return `${userId}:${action}:${Math.floor(now.getTime() / 60_000)}`;
}

export function firstAcceptanceFilter(userId: string, challengeId: string) {
  return { clerkUserId: userId, 'acceptedChallenges.challengeId': { $ne: challengeId } };
}
