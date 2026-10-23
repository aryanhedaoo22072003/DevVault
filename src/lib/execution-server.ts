import mongoose from 'mongoose';

import { connectToDatabase } from '@/lib/db';
import { buildExecutionSource, classifyJudge0Status, executionRateKey, firstAcceptanceFilter, outputsMatch, readJudge0Config, truncateOutput, CHALLENGE_XP, type ExecutionStatus, type Judge0Config } from '@/lib/execution';
import { ExecutionRateLimitModel } from '@/models/execution-rate-limit.model';
import { StudentLearningProgressModel } from '@/models/learning-progress.model';
import type { ChallengeLanguage } from '@/models/coding-challenge.model';

type TestCase = { input: string; expectedOutput: string };
export type TestExecution = { status: ExecutionStatus; stdout: string; stderr: string; compileOutput: string; time?: number; memory?: number; passed: boolean };

let availabilityCache: { expires: number; result: { operational: boolean; reason: string }; config?: Judge0Config } | null = null;
function headers(config: Judge0Config) { return { 'Content-Type': 'application/json', ...(config.authHeader && config.authToken ? { [config.authHeader]: config.authToken } : {}) }; }

export async function getExecutionAvailability(force = false) {
  const now = Date.now();
  if (!force && availabilityCache && availabilityCache.expires > now) return availabilityCache.result;
  const loaded = readJudge0Config();
  if (!loaded.config) return { operational: false, reason: loaded.reason ?? 'The isolated runner is unavailable.' };
  try {
    const [configResponse, languagesResponse] = await Promise.all([
      fetch(`${loaded.config.endpoint}/config_info`, { headers: headers(loaded.config), signal: AbortSignal.timeout(5_000), cache: 'no-store' }),
      fetch(`${loaded.config.endpoint}/languages`, { headers: headers(loaded.config), signal: AbortSignal.timeout(5_000), cache: 'no-store' }),
    ]);
    if (!configResponse.ok || !languagesResponse.ok) throw new Error('health check failed');
    const capabilities = await configResponse.json() as { allow_enable_network?: boolean; enable_network?: boolean };
    const languages = await languagesResponse.json() as Array<{ id: number }>;
    const ids = new Set(languages.map((language) => language.id));
    if (!ids.has(loaded.config.languageIds.python) || !ids.has(loaded.config.languageIds.javascript)) throw new Error('language mapping unavailable');
    if (capabilities.allow_enable_network !== true && capabilities.enable_network !== false) throw new Error('network isolation cannot be verified');
    const result = { operational: true, reason: 'Isolated execution is operational.' };
    availabilityCache = { expires: now + 60_000, result, config: loaded.config };
    return result;
  } catch {
    const result = { operational: false, reason: 'The isolated execution service could not be verified.' };
    availabilityCache = { expires: now + 15_000, result };
    return result;
  }
}

async function operationalConfig() {
  const result = await getExecutionAvailability();
  if (!result.operational || !availabilityCache?.config) throw new Error(result.reason);
  return availabilityCache.config;
}

export async function executeTest(language: ChallengeLanguage, source: string, entrypoint: string, test: TestCase): Promise<TestExecution> {
  const config = await operationalConfig();
  const response = await fetch(`${config.endpoint}/submissions?base64_encoded=false&wait=false`, {
    method: 'POST', headers: headers(config), signal: AbortSignal.timeout(5_000),
    body: JSON.stringify({ source_code: buildExecutionSource(language, source, entrypoint, test.input), language_id: config.languageIds[language], cpu_time_limit: 2, cpu_extra_time: 0.5, wall_time_limit: 5, memory_limit: 131_072, max_file_size: 1_024, number_of_runs: 1, enable_network: false }),
  });
  if (!response.ok) throw new Error('The execution service rejected the request.');
  const created = await response.json() as { token?: string };
  if (!created.token) throw new Error('The execution service returned no job token.');
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 350));
    const resultResponse = await fetch(`${config.endpoint}/submissions/${encodeURIComponent(created.token)}?base64_encoded=false&fields=stdout,stderr,compile_output,message,status,time,memory`, { headers: headers(config), signal: AbortSignal.timeout(5_000), cache: 'no-store' });
    if (!resultResponse.ok) throw new Error('The execution result could not be retrieved.');
    const result = await resultResponse.json() as { stdout?: string; stderr?: string; compile_output?: string; message?: string; status?: { id: number; description: string }; time?: string; memory?: number };
    if (!result.status || result.status.id <= 2) continue;
    const processStatus = classifyJudge0Status(result.status.id, result.status.description);
    const stdout = truncateOutput(result.stdout); const stderr = truncateOutput(result.stderr ?? result.message); const compileOutput = truncateOutput(result.compile_output);
    const passed = processStatus === 'accepted' && outputsMatch(stdout, test.expectedOutput);
    return { status: processStatus === 'accepted' && !passed ? 'wrong_answer' : processStatus, stdout, stderr, compileOutput, time: result.time ? Number(result.time) : undefined, memory: result.memory, passed };
  }
  return { status: 'time_limit', stdout: '', stderr: 'Execution timed out.', compileOutput: '', passed: false };
}

export async function executeTests(language: ChallengeLanguage, source: string, entrypoint: string, tests: TestCase[]) {
  const results: TestExecution[] = [];
  for (const test of tests) {
    const result = await executeTest(language, source, entrypoint, test); results.push(result);
    if (result.status !== 'accepted' && result.status !== 'wrong_answer') break;
  }
  return results;
}

export async function enforceExecutionRateLimit(userId: string, action: 'run' | 'submit') {
  await connectToDatabase(); const now = new Date(); const limit = action === 'run' ? 10 : 5;
  const record = await ExecutionRateLimitModel.findOneAndUpdate({ key: executionRateKey(userId, action, now) }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(now.getTime() + 120_000) } }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }).lean();
  if (record && record.count > limit) throw new Error('RATE_LIMITED');
}

export async function awardChallengeXpOnce(userId: string, challengeId: mongoose.Types.ObjectId, challengeSlug: string) {
  await StudentLearningProgressModel.updateOne({ clerkUserId: userId }, { $setOnInsert: { clerkUserId: userId } }, { upsert: true, setDefaultsOnInsert: true });
  const result = await StudentLearningProgressModel.updateOne(firstAcceptanceFilter(userId, String(challengeId)), { $push: { acceptedChallenges: { challengeId, challengeSlug, xp: CHALLENGE_XP, acceptedAt: new Date() } }, $inc: { xp: CHALLENGE_XP } });
  return result.modifiedCount === 1 ? CHALLENGE_XP : 0;
}
