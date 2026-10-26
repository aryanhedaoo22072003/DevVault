import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('browser runner response headers', () => {
  it('keeps normal pages unframeable while permitting only the same-origin sandbox frame', async () => {
    const config = readFileSync(resolve(process.cwd(), 'next.config.mjs'), 'utf8');
    expect(config).toContain("source: '/((?!devvault-browser-runner\\\\.html$).*)'");
    expect(config).toContain("{ key: 'X-Frame-Options', value: 'DENY' }");
    expect(config).toContain("frame-ancestors 'none'");
    expect(config).toContain("source: '/devvault-browser-runner.html'");
    expect(config).toContain("frame-ancestors 'self'");
    expect(config).toContain('sandbox allow-scripts');
  });
});
