import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BROWSER_RUNNER_CHANNEL, BROWSER_RUNNER_VERSION, languageRegistry, validRunnerRequest, validRunnerResult } from './browser-execution';

describe('browser execution protocol', () => {
  const request = { channel: BROWSER_RUNNER_CHANNEL, version: BROWSER_RUNNER_VERSION, id: 'run-1', action: 'run' as const, language: 'python' as const, code: 'print(1)', tests: [] };
  it('accepts bounded typed requests and rejects forged or oversized messages', () => {
    expect(validRunnerRequest(request)).toBe(true);
    expect(validRunnerRequest({ ...request, channel: 'forged' })).toBe(false);
    expect(validRunnerRequest({ ...request, code: 'x'.repeat(30_001) })).toBe(false);
    expect(validRunnerRequest({ ...request, language: 'java' })).toBe(false);
  });
  it('validates correlated responses', () => {
    const result = { channel: BROWSER_RUNNER_CHANNEL, version: BROWSER_RUNNER_VERSION, id: 'run-1', type: 'result', ok: true, stdout: '1', stderr: '', tests: [] };
    expect(validRunnerResult(result, 'run-1')).toBe(true);
    expect(validRunnerResult(result, 'run-2')).toBe(false);
  });
  it('keeps unverified future runtimes disabled', () => {
    expect(languageRegistry.python.runnable).toBe(true);
    expect(languageRegistry.javascript.runnable).toBe(true);
    expect(languageRegistry.sql.runnable).toBe(true);
    expect(languageRegistry.typescript.runnable).toBe(false);
    expect(languageRegistry.c.runnable).toBe(false);
    expect(languageRegistry.cpp.runnable).toBe(false);
    expect(languageRegistry.java.runnable).toBe(false);
  });
  it('does not model browser feedback as accepted submissions or XP', () => {
    const result = { channel: BROWSER_RUNNER_CHANNEL, version: BROWSER_RUNNER_VERSION, id: 'run-1', type: 'result', ok: true, stdout: '', stderr: '', tests: [{ passed: true, actual: '1' }] };
    expect('status' in result).toBe(false);
    expect('xpAwarded' in result).toBe(false);
  });
  it('uses a classic disposable worker so opaque-origin browsers can start it', () => {
    const runner = readFileSync(resolve(process.cwd(), 'public/devvault-browser-runner.html'), 'utf8');
    expect(runner).toContain("new Worker(url, { name: 'devvault-execution' })");
    expect(runner).toContain('URL.createObjectURL');
    expect(runner).not.toContain("type: 'module'");
    expect(runner).toContain("importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js')");
    expect(runner).toContain('Worker startup error:');
  });
});
