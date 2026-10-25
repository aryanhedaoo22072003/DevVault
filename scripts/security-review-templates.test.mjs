import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('.devvault-private/generated/security-review-templates');
const editable = path.join(root, 'editable-templates');

describe('Security Review Templates deliverables', () => {
  it('contains sixteen substantive editable templates with no credential-like values', async () => {
    const files = (await fs.readdir(editable)).filter((name) => name !== 'manifest.json').sort();
    expect(files).toHaveLength(16);
    for (const filename of files) {
      const text = await fs.readFile(path.join(editable, filename), 'utf8');
      expect(text.length).toBeGreaterThan(filename.endsWith('.csv') ? 250 : 1_700);
      expect(text).not.toMatch(/(?:sk_live_|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----)/);
    }
  });

  it('has parseable consistent CSV rows and an accurate JSON manifest', async () => {
    for (const filename of ['03-asset-inventory-data-classification.csv', '13-security-risk-register.csv', '14-findings-remediation-tracker.csv']) {
      const rows = (await fs.readFile(path.join(editable, filename), 'utf8')).trim().split('\n').map((row) => row.split(','));
      expect(rows).toHaveLength(2);
      expect(rows[1]).toHaveLength(rows[0].length);
    }
    const manifest = JSON.parse(await fs.readFile(path.join(editable, 'manifest.json'), 'utf8'));
    expect(manifest.templateCount).toBe(16);
    expect(manifest.files).toHaveLength(16);
  });

  it('creates distinct paid and public artifacts with valid signatures', async () => {
    const [guide, sample, archive] = await Promise.all([
      fs.readFile(path.join(root, 'security-review-templates-companion-guide-v1.pdf')),
      fs.readFile(path.join(root, 'security-review-templates-public-sample-v1.pdf')),
      fs.readFile(path.join(root, 'security-review-templates-editable-pack-v1.zip')),
    ]);
    expect(guide.subarray(0, 5).toString()).toBe('%PDF-');
    expect(sample.subarray(0, 5).toString()).toBe('%PDF-');
    expect(archive.subarray(0, 4).toString('hex')).toBe('504b0304');
    expect(guide.length).toBeGreaterThan(sample.length * 4);
    expect(guide.equals(sample)).toBe(false);
  });
});
