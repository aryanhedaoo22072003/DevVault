import { createHash } from 'node:crypto';
import type { Readable } from 'node:stream';

export const STORAGE_MIGRATION_CONFIRMATION = 'MIGRATE_LOCAL_ASSETS_TO_S3';

export function mayApplyStorageMigration(options: { apply: boolean; confirmation?: string; provider: string }) {
  if (!options.apply) return false;
  if (options.confirmation !== STORAGE_MIGRATION_CONFIRMATION) throw new Error(`Apply mode requires --confirm=${STORAGE_MIGRATION_CONFIRMATION}.`);
  if (options.provider !== 's3-private') throw new Error('Apply mode requires PRIVATE_STORAGE_PROVIDER=s3-private.');
  return true;
}

export async function streamToVerifiedBuffer(stream: Readable, expectedSize: number) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > expectedSize) throw new Error('Stored asset exceeds its recorded size.');
    chunks.push(buffer);
  }
  if (size !== expectedSize) throw new Error('Stored asset size does not match its database record.');
  const body = Buffer.concat(chunks);
  return { body, checksumSha256: createHash('sha256').update(body).digest('hex') };
}

export function checksumsMatch(localChecksum: string, remoteChecksum: string) {
  return /^[a-f0-9]{64}$/.test(localChecksum) && localChecksum === remoteChecksum;
}
