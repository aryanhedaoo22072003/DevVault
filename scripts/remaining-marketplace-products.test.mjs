import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve('.devvault-private/generated/remaining-products');
const secretPattern = /(?:sk_live_|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|mongodb\+srv:\/\/[^\s]+:[^\s]+@)/;

function entries(zip) {
  return execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).trim().split('\n');
}

function csvColumns(row) {
  let count = 1;
  let quoted = false;
  for (let index = 0; index < row.length; index += 1) {
    if (row[index] === '"' && row[index + 1] === '"' && quoted) index += 1;
    else if (row[index] === '"') quoted = !quoted;
    else if (row[index] === ',' && !quoted) count += 1;
  }
  return count;
}

describe('remaining marketplace deliverables', () => {
  it('provides twenty substantive AI workflows with parseable structured formats', async () => {
    const folder = path.join(root, 'ai-copilot-workflow-pack', 'editable-workflows');
    const resources = (await fs.readdir(folder)).filter((name) => name !== 'README.md');
    expect(resources).toHaveLength(20);
    for (const name of resources) {
      const text = await fs.readFile(path.join(folder, name), 'utf8');
      expect(text.length).toBeGreaterThan(name.endsWith('.md') ? 1_700 : 250);
      expect(text).not.toMatch(secretPattern);
      if (name.endsWith('.json')) expect(() => JSON.parse(text)).not.toThrow();
      if (name.endsWith('.csv')) {
        const rows = text.trim().split('\n');
        expect(rows.length).toBeGreaterThanOrEqual(2);
        expect(rows.every((row) => csvColumns(row) === csvColumns(rows[0]))).toBe(true);
        expect(csvColumns(rows[0])).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it('ships safe standalone source archives with lockfiles and no traversal entries', async () => {
    for (const [folder, archive, prefix] of [
      ['full-stack-starter-kit', 'full-stack-starter-kit-source-v1.zip', 'full-stack-starter-kit/'],
      ['nextjs-launch-kit', 'nextjs-launch-kit-source-v1.zip', 'nextjs-launch-kit/'],
    ]) {
      const zip = path.join(root, folder, archive);
      const names = entries(zip);
      expect(names.every((name) => name.startsWith(prefix) && !name.split('/').includes('..'))).toBe(true);
      expect(names).toContain(`${prefix}package-lock.json`);
      expect(names).toContain(`${prefix}README.md`);
      expect(names.some((name) => name.includes('node_modules'))).toBe(false);
      expect(names.some((name) => name.includes('.next/'))).toBe(false);
      expect(await fs.readFile(zip)).not.toEqual(Buffer.alloc(0));
    }
  });

  it('keeps full-stack and launch-kit scopes materially distinct', async () => {
    const full = await fs.readFile(path.join(root, 'full-stack-starter-kit', 'source', 'README.md'), 'utf8');
    const launch = await fs.readFile(path.join(root, 'nextjs-launch-kit', 'source', 'README.md'), 'utf8');
    expect(full).toMatch(/Clerk server authentication/);
    expect(full).toMatch(/MongoDB\/Mongoose/);
    expect(launch).toMatch(/marketing-site template/);
    expect(launch).toMatch(/accessible contact form/);
  });

  it('creates separate full and public PDF artifacts for every product', async () => {
    for (const [folder, full, sample] of [
      ['ai-copilot-workflow-pack', 'ai-copilot-workflow-pack-companion-guide-v1.pdf', 'ai-copilot-workflow-pack-public-sample-v1.pdf'],
      ['full-stack-starter-kit', 'full-stack-starter-kit-setup-guide-v1.pdf', 'full-stack-starter-kit-public-sample-v1.pdf'],
      ['nextjs-launch-kit', 'nextjs-launch-kit-guide-v1.pdf', 'nextjs-launch-kit-public-sample-v1.pdf'],
    ]) {
      const [paid, preview] = await Promise.all([fs.readFile(path.join(root, folder, full)), fs.readFile(path.join(root, folder, sample))]);
      expect(paid.subarray(0, 5).toString()).toBe('%PDF-');
      expect(preview.subarray(0, 5).toString()).toBe('%PDF-');
      expect(paid.length).toBeGreaterThan(preview.length * 4);
      expect(paid.equals(preview)).toBe(false);
    }
  });
});
