import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import { buildPublicPreviewFilter, createS3StorageAdapter, safeAssetDownloadLabel, sanitizeDownloadFilename, validatePrivateUpload, validatePublicPreviewUpload, validateS3StorageConfiguration, validateStorageKey, validateStorageProvider } from './private-storage';

describe('private storage validation', () => {
  it('creates public labels without exposing private paths', () => {
    expect(safeAssetDownloadLabel('/private/server/course.pdf', 'application/pdf')).toBe('Download PDF');
    expect(safeAssetDownloadLabel('../../bundle.zip', 'application/zip')).toBe('Download bundle.zip');
    expect(safeAssetDownloadLabel('', 'application/octet-stream')).toBe('Download file');
  });
  it('accepts approved matching PDF and ZIP files', () => {
    expect(validatePrivateUpload({ name: 'guide.pdf', type: 'application/pdf', size: 1024 })).toMatchObject({ filename: 'guide.pdf', extension: '.pdf' });
    expect(validatePrivateUpload({ name: 'source.zip', type: 'application/zip', size: 2048 })).toMatchObject({ extension: '.zip' });
  });

  it('rejects invalid types, mismatched extensions, empty files, and oversized files', () => {
    expect(() => validatePrivateUpload({ name: 'payload.exe', type: 'application/octet-stream', size: 10 })).toThrow();
    expect(() => validatePrivateUpload({ name: 'fake.zip', type: 'application/pdf', size: 10 })).toThrow();
    expect(() => validatePrivateUpload({ name: 'empty.pdf', type: 'application/pdf', size: 0 })).toThrow();
    expect(() => validatePrivateUpload({ name: 'large.pdf', type: 'application/pdf', size: 60_000_000 })).toThrow();
  });

  it('blocks traversal and absolute storage paths', () => {
    expect(() => validateStorageKey('../secret.pdf')).toThrow();
    expect(() => validateStorageKey('/tmp/secret.pdf')).toThrow();
    expect(validateStorageKey('product-id/asset.pdf')).toBe('product-id/asset.pdf');
    expect(sanitizeDownloadFilename('../../safe guide.pdf')).toBe('safe guide.pdf');
  });
  it('allows only bounded public preview formats and requires explicit public visibility', () => {
    expect(validatePublicPreviewUpload({ name: 'sample.pdf', type: 'application/pdf', size: 1000 })).toMatchObject({ extension: '.pdf' });
    expect(() => validatePublicPreviewUpload({ name: 'sample.zip', type: 'application/zip', size: 1000 })).toThrow();
    expect(() => validatePublicPreviewUpload({ name: 'large.pdf', type: 'application/pdf', size: 6_000_000 })).toThrow();
    expect(buildPublicPreviewFilter('asset')).toEqual({ _id: 'asset', isPublic: true, isActive: true, storageKey: { $nin: ['', null] } });
  });

  it('rejects unknown providers rather than falling back', () => {
    expect(validateStorageProvider('local-private')).toBe('local-private');
    expect(validateStorageProvider('s3-private')).toBe('s3-private');
    expect(() => validateStorageProvider('public')).toThrow(/unsupported/i);
  });

  it('fails closed for incomplete or insecure S3-compatible configuration', () => {
    const base = { endpoint: '', region: 'region-1', bucket: 'private', prefix: 'assets', forcePathStyle: false, accessKeyId: '', secretAccessKey: '' };
    expect(validateS3StorageConfiguration(base)).toMatchObject({ bucket: 'private' });
    expect(() => validateS3StorageConfiguration({ ...base, endpoint: 'http://storage.internal' })).toThrow(/HTTPS/i);
    expect(() => validateS3StorageConfiguration({ ...base, bucket: '' })).toThrow(/bucket/i);
    expect(() => validateS3StorageConfiguration({ ...base, accessKeyId: 'id' })).toThrow(/pair/i);
  });
});

describe('S3-compatible private storage', () => {
  it('uploads and verifies object size, type, and checksum', async () => {
    const body = Buffer.from('private guide');
    const send = vi.fn(async (command: object) => {
      if (command.constructor.name === 'PutObjectCommand') return {};
      return { ContentLength: body.length, ContentType: 'application/pdf', Metadata: { sha256: '83481bfe08a902c153f3cbeb0bdbc138d010cfb0dfb0df62bd14ca01cf622d60' } };
    });
    const adapter = createS3StorageAdapter({ send }, { bucket: 'private-test', prefix: 'assets' });
    await expect(adapter.putBuffer('product/guide.pdf', body, 'application/pdf')).resolves.toMatchObject({ size: body.length });
    expect(send.mock.calls.map(([command]) => command.constructor.name)).toEqual(['PutObjectCommand', 'HeadObjectCommand']);
  });

  it('streams objects consistently and treats missing objects as absent', async () => {
    const body = Buffer.from('download');
    const send = vi.fn(async (command: object) => {
      if (command.constructor.name === 'GetObjectCommand') return { Body: Readable.from(body), ContentLength: body.length, ContentType: 'application/pdf' };
      throw new Error('not found');
    });
    const adapter = createS3StorageAdapter({ send }, { bucket: 'private-test' });
    const opened = await adapter.open('product/guide.pdf', { expectedSize: body.length, expectedMimeType: 'application/pdf' });
    const chunks: Buffer[] = [];
    for await (const chunk of opened.stream) chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks)).toEqual(body);
    await expect(adapter.exists('product/missing.pdf')).resolves.toBe(false);
  });

  it('cleans up an unverifiable upload and never reports it as stored', async () => {
    const body = Buffer.from('private guide');
    const send = vi.fn(async (command: object) => {
      if (command.constructor.name === 'HeadObjectCommand') return { ContentLength: body.length + 1, ContentType: 'application/pdf', Metadata: { sha256: 'wrong' } };
      return {};
    });
    const adapter = createS3StorageAdapter({ send }, { bucket: 'private-test' });
    await expect(adapter.putBuffer('product/guide.pdf', body, 'application/pdf')).rejects.toThrow(/verification/i);
    expect(send.mock.calls.map(([command]) => command.constructor.name)).toEqual(['PutObjectCommand', 'HeadObjectCommand', 'DeleteObjectCommand']);
  });

  it('attempts cleanup when an upload request fails ambiguously', async () => {
    const send = vi.fn(async (command: object) => {
      if (command.constructor.name === 'PutObjectCommand') throw new Error('connection lost');
      return {};
    });
    const adapter = createS3StorageAdapter({ send }, { bucket: 'private-test' });
    await expect(adapter.putBuffer('product/guide.pdf', Buffer.from('content'), 'application/pdf')).rejects.toThrow(/connection lost/i);
    expect(send.mock.calls.map(([command]) => command.constructor.name)).toEqual(['PutObjectCommand', 'DeleteObjectCommand']);
  });
});
