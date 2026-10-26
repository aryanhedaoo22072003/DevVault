import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, type ReadStream } from 'node:fs';
import { mkdir, open, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';

import { env } from '@/lib/env';

export type StorageProvider = 'local-private' | 's3-private';
export type StorageOpenResult = { stream: Readable; size: number; contentType?: string; checksumSha256?: string };
export type StoragePutResult = { key: string; filename: string; mimeType: string; size: number; provider: StorageProvider; checksumSha256: string };
type ExpectedObject = { expectedSize?: number; expectedMimeType?: string };
type S3Sender = { send(command: object): Promise<Record<string, unknown>> };

export const APPROVED_ASSET_TYPES = new Map([
  ['application/pdf', '.pdf'], ['application/zip', '.zip'], ['application/x-zip-compressed', '.zip'],
  ['text/plain', '.txt'], ['text/markdown', '.md'], ['application/json', '.json'],
]);
export const PUBLIC_PREVIEW_TYPES = new Set(['application/pdf', 'text/plain', 'text/markdown', 'application/json']);
export const MAX_PUBLIC_PREVIEW_BYTES = 5_242_880;

export function sanitizeDownloadFilename(value: string) {
  const basename = path.basename(value).replace(/[^a-zA-Z0-9._ -]/g, '_').trim();
  if (!basename || basename === '.' || basename === '..') throw new Error('Invalid asset filename.');
  return basename.slice(0, 160);
}
export function safeAssetDownloadLabel(filename: string | null | undefined, mimeType: string | null | undefined) {
  if (mimeType === 'application/pdf') return 'Download PDF';
  try { return `Download ${sanitizeDownloadFilename(filename || 'file')}`; } catch { return 'Download file'; }
}
export function validateStorageKey(key: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9/_-]*\.[a-zA-Z0-9]+$/.test(key) || key.includes('..') || path.isAbsolute(key) || key.length > 512) throw new Error('Invalid private storage key.');
  return key;
}
export function validateStorageProvider(value: string): StorageProvider {
  if (value !== 'local-private' && value !== 's3-private') throw new Error('Unsupported private storage provider.');
  return value;
}
function storageRoot() {
  // Local-private storage is a development adapter. These files must not be traced
  // into a serverless bundle; production uses the configured s3-private adapter.
  // Runtime containment checks below still validate every resolved local path.
  const root = path.resolve(/* turbopackIgnore: true */ process.cwd(), env.privateStorageRoot); const publicRoot = path.resolve(process.cwd(), 'public');
  if (root === publicRoot || root.startsWith(`${publicRoot}${path.sep}`)) throw new Error('Private storage cannot be located under public/.'); return root;
}
function resolvePrivatePath(key: string) {
  const root = storageRoot(); const target = path.resolve(/* turbopackIgnore: true */ root, validateStorageKey(key));
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error('Invalid private storage path.'); return target;
}
export function validatePrivateUpload(file: Pick<File, 'name' | 'type' | 'size'>) {
  const filename = sanitizeDownloadFilename(file.name); const expectedExtension = APPROVED_ASSET_TYPES.get(file.type);
  if (!expectedExtension || path.extname(filename).toLowerCase() !== expectedExtension) throw new Error('Unsupported or mismatched asset file type.');
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > env.maxPrivateAssetBytes) throw new Error('Asset file size is invalid or exceeds the configured limit.');
  return { filename, extension: expectedExtension };
}
export function validatePublicPreviewUpload(file: Pick<File, 'name' | 'type' | 'size'>) {
  const validated = validatePrivateUpload(file); if (!PUBLIC_PREVIEW_TYPES.has(file.type)) throw new Error('Public previews must be PDF, TXT, Markdown, or JSON files.');
  if (file.size > MAX_PUBLIC_PREVIEW_BYTES) throw new Error('Public previews must be 5 MB or smaller.'); return validated;
}
export function buildPublicPreviewFilter(assetId: string) { return { _id: assetId, isPublic: true, isActive: true, storageKey: { $nin: ['', null] } }; }

function sha256(buffer: Buffer) { return createHash('sha256').update(buffer).digest('hex'); }
function assertExpected(size: number, type: string | undefined, expected: ExpectedObject) {
  if (expected.expectedSize !== undefined && size !== expected.expectedSize) throw new Error('Stored object size does not match the asset record.');
  if (expected.expectedMimeType && type && type !== expected.expectedMimeType) throw new Error('Stored object content type does not match the asset record.');
}
export function validateS3StorageConfiguration(input: { endpoint: string; region: string; bucket: string; prefix: string; forcePathStyle: boolean; accessKeyId: string; secretAccessKey: string }) {
  const endpoint = input.endpoint.trim();
  if (endpoint && (!URL.canParse(endpoint) || new URL(endpoint).protocol !== 'https:')) throw new Error('S3 endpoint must use HTTPS.');
  if (!input.bucket || !input.region) throw new Error('S3 private storage requires bucket and region configuration.');
  if ((input.accessKeyId && !input.secretAccessKey) || (!input.accessKeyId && input.secretAccessKey)) throw new Error('S3 static credentials must be configured as a pair.');
  const config: S3ClientConfig = { region: input.region, ...(endpoint ? { endpoint } : {}), forcePathStyle: input.forcePathStyle };
  if (input.accessKeyId && input.secretAccessKey) config.credentials = { accessKeyId: input.accessKeyId, secretAccessKey: input.secretAccessKey };
  return { bucket: input.bucket, prefix: input.prefix, config };
}
export function s3Configuration() {
  return validateS3StorageConfiguration({ endpoint: env.s3Endpoint, region: env.s3Region, bucket: env.s3Bucket, prefix: env.s3Prefix, forcePathStyle: env.s3ForcePathStyle, accessKeyId: env.s3AccessKeyId, secretAccessKey: env.s3SecretAccessKey });
}
export function createS3StorageAdapter(client: S3Sender, options: { bucket: string; prefix?: string }) {
  const prefix = options.prefix?.replace(/^\/+|\/+$/g, '') ?? ''; const objectKey = (key: string) => `${prefix ? `${prefix}/` : ''}${validateStorageKey(key)}`;
  return {
    async putBuffer(key: string, body: Buffer, mimeType: string) {
      validateStorageKey(key); if (!APPROVED_ASSET_TYPES.has(mimeType) || body.length <= 0 || body.length > env.maxPrivateAssetBytes) throw new Error('Invalid storage upload.');
      const digest = sha256(body); const Key = objectKey(key);
      try {
        await client.send(new PutObjectCommand({ Bucket: options.bucket, Key, Body: body, ContentLength: body.length, ContentType: mimeType, Metadata: { sha256: digest }, ChecksumSHA256: Buffer.from(digest, 'hex').toString('base64') }));
        const head = await client.send(new HeadObjectCommand({ Bucket: options.bucket, Key })); const size = Number(head.ContentLength); const type = typeof head.ContentType === 'string' ? head.ContentType : undefined;
        const remoteHash = typeof (head.Metadata as Record<string, string> | undefined)?.sha256 === 'string' ? (head.Metadata as Record<string, string>).sha256 : undefined;
        if (size !== body.length || type !== mimeType || remoteHash !== digest) throw new Error('Remote object verification failed.');
      } catch (error) { await client.send(new DeleteObjectCommand({ Bucket: options.bucket, Key })).catch(() => undefined); throw error; }
      return { size: body.length, checksumSha256: digest };
    },
    async open(key: string, expected: ExpectedObject = {}): Promise<StorageOpenResult> {
      const response = await client.send(new GetObjectCommand({ Bucket: options.bucket, Key: objectKey(key) })); if (!response.Body) throw new Error('Stored object has no body.');
      const size = Number(response.ContentLength); if (!Number.isSafeInteger(size) || size < 0) throw new Error('Stored object size is invalid.');
      const type = typeof response.ContentType === 'string' ? response.ContentType : undefined; assertExpected(size, type, expected);
      const body = response.Body as Readable | { transformToWebStream(): ReadableStream };
      const stream = body instanceof Readable ? body : Readable.fromWeb(body.transformToWebStream() as never);
      return { stream, size, contentType: type, checksumSha256: (response.Metadata as Record<string, string> | undefined)?.sha256 };
    },
    async exists(key: string, expected: ExpectedObject = {}) {
      try { const head = await client.send(new HeadObjectCommand({ Bucket: options.bucket, Key: objectKey(key) })); assertExpected(Number(head.ContentLength), typeof head.ContentType === 'string' ? head.ContentType : undefined, expected); return true; } catch { return false; }
    },
  };
}

const localAdapter = {
  async putBuffer(key: string, body: Buffer) { const target = resolvePrivatePath(key); await mkdir(path.dirname(target), { recursive: true, mode: 0o700 }); await writeFile(target, body, { mode: 0o600, flag: 'wx' }); return { size: body.length, checksumSha256: sha256(body) }; },
  async open(key: string, expected: ExpectedObject = {}): Promise<StorageOpenResult> { const target = resolvePrivatePath(key); const handle = await open(target, 'r'); await handle.close(); const metadata = await stat(target); if (!metadata.isFile()) throw new Error('Private asset is not a file.'); assertExpected(metadata.size, undefined, expected); return { stream: createReadStream(target) as ReadStream, size: metadata.size }; },
  async exists(key: string, expected: ExpectedObject = {}) { try { const metadata = await stat(resolvePrivatePath(key)); assertExpected(metadata.size, undefined, expected); return metadata.isFile(); } catch { return false; } },
};
let cachedS3Adapter: ReturnType<typeof createS3StorageAdapter> | undefined;
function adapter(provider: StorageProvider) {
  if (provider === 'local-private') return localAdapter;
  if (!cachedS3Adapter) { const value = s3Configuration(); cachedS3Adapter = createS3StorageAdapter(new S3Client(value.config) as unknown as S3Sender, { bucket: value.bucket, prefix: value.prefix }); }
  return cachedS3Adapter;
}
export const privateStorage = {
  async put(file: File, productId: string): Promise<StoragePutResult> {
    const { filename, extension } = validatePrivateUpload(file); const safeProductId = productId.replace(/[^a-zA-Z0-9_-]/g, ''); if (!safeProductId) throw new Error('Invalid product storage namespace.');
    const provider = validateStorageProvider(env.storageProvider); const key = `${safeProductId}/${randomUUID()}${extension}`; const body = Buffer.from(await file.arrayBuffer()); const stored = await adapter(provider).putBuffer(key, body, file.type);
    return { key, filename, mimeType: file.type, size: stored.size, provider, checksumSha256: stored.checksumSha256 };
  },
  open(key: string, provider: StorageProvider = 'local-private', expected: ExpectedObject = {}) { return adapter(validateStorageProvider(provider)).open(key, expected); },
  exists(key: string, provider: StorageProvider = 'local-private', expected: ExpectedObject = {}) { return adapter(validateStorageProvider(provider)).exists(key, expected); },
  putBuffer(key: string, body: Buffer, mimeType: string, provider: StorageProvider) { return adapter(validateStorageProvider(provider)).putBuffer(key, body, mimeType); },
};
