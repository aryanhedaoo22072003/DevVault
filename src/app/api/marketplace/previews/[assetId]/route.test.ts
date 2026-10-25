import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const connectToDatabase = vi.fn();
const findOne = vi.fn();
const open = vi.fn();

vi.mock('@/lib/db', () => ({ connectToDatabase }));
vi.mock('@/models/digital-asset.model', () => ({ DigitalAssetModel: { findOne } }));
vi.mock('@/lib/private-storage', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/private-storage')>();
  return { ...original, privateStorage: { open } };
});

const assetId = '507f1f77bcf86cd799439011';

describe('public marketplace previews', () => {
  beforeEach(() => vi.clearAllMocks());

  it('streams an explicitly public active preview without authentication', async () => {
    findOne.mockReturnValue({ lean: () => Promise.resolve({ _id: assetId, title: 'Sample', isPublic: true, isActive: true, storageKey: 'product/sample.pdf', storageProvider: 's3-private', originalFilename: 'sample.pdf', mimeType: 'application/pdf', fileSize: 7 }) });
    open.mockResolvedValue({ stream: Readable.from(Buffer.from('preview')), size: 7 });
    const { GET } = await import('./route');
    const response = await GET(new Request(`http://localhost/api/marketplace/previews/${assetId}`), { params: Promise.resolve({ assetId }) });
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe('preview');
    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({ isPublic: true, isActive: true }));
    expect(open).toHaveBeenCalledWith('product/sample.pdf', 's3-private', { expectedSize: 7, expectedMimeType: 'application/pdf' });
  });

  it('does not open a private, inactive, or absent asset through the preview route', async () => {
    findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
    const { GET } = await import('./route');
    const response = await GET(new Request(`http://localhost/api/marketplace/previews/${assetId}`), { params: Promise.resolve({ assetId }) });
    expect(response.status).toBe(404);
    expect(open).not.toHaveBeenCalled();
  });
});
