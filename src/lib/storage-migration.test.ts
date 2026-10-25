import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';

import { checksumsMatch, mayApplyStorageMigration, STORAGE_MIGRATION_CONFIRMATION, streamToVerifiedBuffer } from './storage-migration';

describe('private asset migration safeguards', () => {
  it('is dry-run by default and requires an explicit confirmation for apply mode', () => {
    expect(mayApplyStorageMigration({ apply: false, provider: 'local-private' })).toBe(false);
    expect(() => mayApplyStorageMigration({ apply: true, provider: 's3-private' })).toThrow(/--confirm/i);
    expect(() => mayApplyStorageMigration({ apply: true, confirmation: STORAGE_MIGRATION_CONFIRMATION, provider: 'local-private' })).toThrow(/s3-private/i);
    expect(mayApplyStorageMigration({ apply: true, confirmation: STORAGE_MIGRATION_CONFIRMATION, provider: 's3-private' })).toBe(true);
  });

  it('hashes a complete stream and rejects truncated or oversized sources', async () => {
    const expected = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';
    await expect(streamToVerifiedBuffer(Readable.from(Buffer.from('hello')), 5)).resolves.toMatchObject({ checksumSha256: expected });
    await expect(streamToVerifiedBuffer(Readable.from(Buffer.from('hello')), 6)).rejects.toThrow(/size/i);
    await expect(streamToVerifiedBuffer(Readable.from(Buffer.from('hello')), 4)).rejects.toThrow(/exceeds/i);
  });

  it('requires exact valid SHA-256 equality before a reference may change', () => {
    const hash = 'a'.repeat(64);
    expect(checksumsMatch(hash, hash)).toBe(true);
    expect(checksumsMatch(hash, 'b'.repeat(64))).toBe(false);
    expect(checksumsMatch('not-a-hash', 'not-a-hash')).toBe(false);
  });
});
