import { createHash, randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { env } from '../src/lib/env';
import { s3Configuration, validateStorageKey } from '../src/lib/private-storage';
import { streamToVerifiedBuffer } from '../src/lib/storage-migration';

function assertR2Configuration() {
  if (env.storageProvider !== 's3-private') throw new Error('PRIVATE_STORAGE_PROVIDER must be s3-private.');
  if (env.s3Region !== 'auto') throw new Error('Cloudflare R2 requires S3_PRIVATE_REGION=auto.');
  if (!env.s3Bucket.trim()) throw new Error('S3_PRIVATE_BUCKET is missing.');
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(env.s3Bucket)) throw new Error('S3_PRIVATE_BUCKET has an invalid name.');
  const endpoint = new URL(env.s3Endpoint);
  if (endpoint.protocol !== 'https:' || !endpoint.hostname.endsWith('.r2.cloudflarestorage.com') || endpoint.pathname !== '/') throw new Error('S3_PRIVATE_ENDPOINT is not a valid Cloudflare R2 HTTPS account endpoint.');
  if (!env.s3Prefix || env.s3Prefix.includes('..') || env.s3Prefix.startsWith('/') || env.s3Prefix.endsWith('/')) throw new Error('S3_PRIVATE_PREFIX must be a non-empty relative prefix.');
  if (!env.s3AccessKeyId || !env.s3SecretAccessKey) throw new Error('R2 static credentials are incomplete.');
}

async function main() {
  assertR2Configuration();
  const configured = s3Configuration();
  const client = new S3Client(configured.config);
  const relativeKey = validateStorageKey(`connection-tests/${randomUUID()}.txt`);
  const objectKey = `${configured.prefix.replace(/^\/+|\/+$/g, '')}/${relativeKey}`;
  const body = Buffer.from(`DevVault R2 connection validation ${randomUUID()}\n`, 'utf8');
  const checksumHex = createHash('sha256').update(body).digest('hex');
  const checksumBase64 = Buffer.from(checksumHex, 'hex').toString('base64');
  let uploadAttempted = false;
  let deleted = false;

  const report = {
    configuration: { provider: true, regionAuto: true, bucket: true, endpoint: true, privatePrefix: true, credentialsPresent: true },
    upload: false,
    checksumRequestAccepted: false,
    head: false,
    readback: false,
    hashMatch: false,
    sizeMatch: false,
    contentTypeMatch: false,
    metadataChecksumMatch: false,
    deleted: false,
    cleanupVerified: false,
  };

  try {
    uploadAttempted = true;
    await client.send(new PutObjectCommand({
      Bucket: configured.bucket,
      Key: objectKey,
      Body: body,
      ContentLength: body.length,
      ContentType: 'text/plain',
      Metadata: { sha256: checksumHex, purpose: 'connection-validation' },
      ChecksumSHA256: checksumBase64,
    }));
    report.upload = true;
    report.checksumRequestAccepted = true;

    const head = await client.send(new HeadObjectCommand({ Bucket: configured.bucket, Key: objectKey }));
    report.head = true;
    report.sizeMatch = head.ContentLength === body.length;
    report.contentTypeMatch = head.ContentType === 'text/plain';
    report.metadataChecksumMatch = head.Metadata?.sha256 === checksumHex;

    const remote = await client.send(new GetObjectCommand({ Bucket: configured.bucket, Key: objectKey }));
    if (!remote.Body) throw new Error('R2 returned an empty object body.');
    const stream = remote.Body instanceof Readable ? remote.Body : Readable.fromWeb(remote.Body.transformToWebStream() as never);
    const downloaded = await streamToVerifiedBuffer(stream, body.length);
    report.readback = true;
    report.hashMatch = downloaded.checksumSha256 === checksumHex;

    if (!report.sizeMatch || !report.contentTypeMatch || !report.metadataChecksumMatch || !report.hashMatch) throw new Error('R2 object verification did not match the uploaded test payload.');
  } finally {
    if (uploadAttempted) {
      await client.send(new DeleteObjectCommand({ Bucket: configured.bucket, Key: objectKey }));
      deleted = true;
      report.deleted = true;
      try {
        await client.send(new HeadObjectCommand({ Bucket: configured.bucket, Key: objectKey }));
      } catch (error) {
        const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
        if (status === 404) report.cleanupVerified = true;
        else throw error;
      }
    }
    client.destroy();
    if (deleted || !uploadAttempted) console.log(JSON.stringify(report, null, 2));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'R2 connection validation failed.');
  process.exitCode = 1;
});
