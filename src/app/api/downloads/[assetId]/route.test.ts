import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const syncUserProfile = vi.fn();
const allowDownload = vi.fn();
const authorizeAssetDownload = vi.fn();
const openPrivateFile = vi.fn();
const recordDownload = vi.fn();

vi.mock('@/lib/auth', () => ({ syncUserProfile }));
vi.mock('@/lib/download-rate-limit', () => ({ allowDownload }));
vi.mock('@/lib/entitlements', () => ({ authorizeAssetDownload }));
vi.mock('@/lib/private-storage', () => ({
  privateStorage: { open: openPrivateFile },
  sanitizeDownloadFilename: (value: string) => value,
}));
vi.mock('@/models/download-activity.model', () => ({ DownloadActivityModel: { create: recordDownload } }));

describe('protected asset downloads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    allowDownload.mockReturnValue(true);
  });

  it('rejects unauthenticated downloads', async () => {
    syncUserProfile.mockResolvedValue(null);
    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/downloads/asset'), { params: Promise.resolve({ assetId: 'asset' }) });
    expect(response.status).toBe(401);
    expect(authorizeAssetDownload).not.toHaveBeenCalled();
  });

  it.each(['non-owner', 'unpaid-order', 'missing-or-unpublished-asset'])('does not expose files for %s access', async () => {
    syncUserProfile.mockResolvedValue({ userId: 'user_owner' });
    authorizeAssetDownload.mockResolvedValue(null);
    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/downloads/asset'), { params: Promise.resolve({ assetId: 'asset' }) });
    expect(response.status).toBe(404);
    expect(openPrivateFile).not.toHaveBeenCalled();
  });

  it('streams an authorized private file with safe response headers', async () => {
    syncUserProfile.mockResolvedValue({ userId: 'user_owner' });
    authorizeAssetDownload.mockResolvedValue({
      order: { _id: 'order' },
      entitlement: { productId: 'product' },
      asset: { _id: 'asset', storageKey: 'product/file.pdf', storageProvider: 's3-private', originalFilename: 'guide.pdf', title: 'Guide', mimeType: 'application/pdf', fileSize: 15 },
    });
    openPrivateFile.mockResolvedValue({ stream: Readable.from(Buffer.from('private-content')), size: 15 });
    recordDownload.mockResolvedValue({});
    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/downloads/asset'), { params: Promise.resolve({ assetId: 'asset' }) });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('content-disposition')).toContain('guide.pdf');
    await expect(response.text()).resolves.toBe('private-content');
    expect(openPrivateFile).toHaveBeenCalledWith('product/file.pdf', 's3-private', { expectedSize: 15, expectedMimeType: 'application/pdf' });
    expect(recordDownload).toHaveBeenCalledOnce();
  });

  it('rate limits authenticated download bursts', async () => {
    syncUserProfile.mockResolvedValue({ userId: 'user_owner' });
    allowDownload.mockReturnValue(false);
    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/downloads/asset'), { params: Promise.resolve({ assetId: 'asset' }) });
    expect(response.status).toBe(429);
  });
});
