import { describe, expect, it } from 'vitest';

import { assetUploadLaunchPolicy, requireSafeAssetUpload } from './asset-upload-policy';

describe('production asset upload launch policy', () => {
  it('keeps local development uploads available', () => {
    expect(assetUploadLaunchPolicy('development')).toEqual({ allowed: true, scannerOperational: false });
    expect(() => requireSafeAssetUpload('test')).not.toThrow();
  });

  it('fails closed in production while no verified scanner exists', () => {
    expect(assetUploadLaunchPolicy('production')).toEqual({ allowed: false, scannerOperational: false });
    expect(() => requireSafeAssetUpload('production')).toThrow(/disabled until malware/i);
  });
});
