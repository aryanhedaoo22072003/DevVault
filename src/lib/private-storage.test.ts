import { describe, expect, it } from 'vitest';

import { buildPublicPreviewFilter, safeAssetDownloadLabel, sanitizeDownloadFilename, validatePrivateUpload, validatePublicPreviewUpload, validateStorageKey } from './private-storage';

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
});
