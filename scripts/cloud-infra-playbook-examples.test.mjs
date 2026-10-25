import { execFileSync, spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const script = new URL('./cloud-infra-playbook-examples.sh', import.meta.url).pathname;
const run = (args, env = {}) => spawnSync('bash', [script, ...args], { encoding: 'utf8', env: { PATH: process.env.PATH, ...env }, timeout: 2_000 });

describe('Cloud Infra Playbook executable examples', () => {
  it('passes bash syntax validation', () => {
    expect(() => execFileSync('bash', ['-n', script], { timeout: 2_000 })).not.toThrow();
  });
  it('accepts a complete bounded environment', () => {
    const result = run(['validate'], { APP_ENV: 'production', PORT: '3000', LOG_LEVEL: 'info' });
    expect(result.status).toBe(0); expect(result.stdout.trim()).toBe('configuration:valid');
  });
  it('fails closed when configuration is missing', () => {
    const result = run(['validate'], { APP_ENV: 'production', PORT: '3000' });
    expect(result.status).toBe(1); expect(result.stdout.trim()).toBe('missing:LOG_LEVEL');
  });
  it('rejects an invalid port', () => {
    const result = run(['validate'], { APP_ENV: 'production', PORT: '70000', LOG_LEVEL: 'info' });
    expect(result.status).toBe(1); expect(result.stdout.trim()).toBe('invalid:PORT');
  });
  it('continues a healthy canary', () => expect(run(['decide', '1', '220']).stdout.trim()).toBe('continue'));
  it('rolls back an unhealthy canary', () => expect(run(['decide', '3', '220']).stdout.trim()).toBe('rollback'));
  it('rolls back excessive latency', () => expect(run(['decide', '1', '650']).stdout.trim()).toBe('rollback'));
  it('emits valid backup-manifest JSON without secrets', () => {
    const output = run(['manifest', 'backup-42', 'sha256:test']).stdout;
    expect(JSON.parse(output)).toEqual({ backupId: 'backup-42', checksum: 'sha256:test', restoreTested: false });
    expect(output).not.toMatch(/password|secret|token/i);
  });
});
