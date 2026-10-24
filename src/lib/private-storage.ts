import { createReadStream } from 'node:fs';
import { mkdir, open, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { env } from '@/lib/env';

export const APPROVED_ASSET_TYPES = new Map([
  ['application/pdf', '.pdf'],
  ['application/zip', '.zip'],
  ['application/x-zip-compressed', '.zip'],
  ['text/plain', '.txt'],
  ['text/markdown', '.md'],
  ['application/json', '.json'],
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
  if (!/^[a-zA-Z0-9][a-zA-Z0-9/_-]*\.[a-zA-Z0-9]+$/.test(key) || key.includes('..') || path.isAbsolute(key)) {
    throw new Error('Invalid private storage key.');
  }
  return key;
}

function storageRoot() {
  const root = path.resolve(process.cwd(), env.privateStorageRoot);
  const publicRoot = path.resolve(process.cwd(), 'public');
  if (root === publicRoot || root.startsWith(`${publicRoot}${path.sep}`)) throw new Error('Private storage cannot be located under public/.');
  return root;
}

function resolvePrivatePath(key: string) {
  const root = storageRoot();
  const target = path.resolve(root, validateStorageKey(key));
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error('Invalid private storage path.');
  return target;
}

export function validatePrivateUpload(file: Pick<File, 'name' | 'type' | 'size'>) {
  const filename = sanitizeDownloadFilename(file.name);
  const expectedExtension = APPROVED_ASSET_TYPES.get(file.type);
  if (!expectedExtension || path.extname(filename).toLowerCase() !== expectedExtension) throw new Error('Unsupported or mismatched asset file type.');
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > env.maxPrivateAssetBytes) throw new Error('Asset file size is invalid or exceeds the configured limit.');
  return { filename, extension: expectedExtension };
}

export function validatePublicPreviewUpload(file: Pick<File, 'name' | 'type' | 'size'>) {
  const validated = validatePrivateUpload(file);
  if (!PUBLIC_PREVIEW_TYPES.has(file.type)) throw new Error('Public previews must be PDF, TXT, Markdown, or JSON files.');
  if (file.size > MAX_PUBLIC_PREVIEW_BYTES) throw new Error('Public previews must be 5 MB or smaller.');
  return validated;
}

export function buildPublicPreviewFilter(assetId: string) {
  return { _id: assetId, isPublic: true, isActive: true, storageKey: { $nin: ['', null] } };
}

export const privateStorage = {
  async put(file: File, productId: string) {
    const { filename, extension } = validatePrivateUpload(file);
    const safeProductId = productId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeProductId) throw new Error('Invalid product storage namespace.');
    const key = `${safeProductId}/${randomUUID()}${extension}`;
    const target = resolvePrivatePath(key);
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, Buffer.from(await file.arrayBuffer()), { mode: 0o600, flag: 'wx' });
    return { key, filename, mimeType: file.type, size: file.size };
  },
  async open(key: string) {
    const target = resolvePrivatePath(key);
    const handle = await open(target, 'r');
    await handle.close();
    const metadata = await stat(target);
    if (!metadata.isFile()) throw new Error('Private asset is not a file.');
    return { stream: createReadStream(target), size: metadata.size };
  },
  async exists(key: string) {
    try {
      const metadata = await stat(resolvePrivatePath(key));
      return metadata.isFile();
    } catch {
      return false;
    }
  },
};
