export function assetUploadLaunchPolicy(runtime = process.env.NODE_ENV) {
  if (runtime !== 'production') return { allowed: true, scannerOperational: false } as const;
  return { allowed: false, scannerOperational: false } as const;
}

export function requireSafeAssetUpload(runtime = process.env.NODE_ENV) {
  const policy = assetUploadLaunchPolicy(runtime);
  if (!policy.allowed) {
    throw new Error('Production asset uploads and replacements are disabled until malware quarantine and scanning are operational.');
  }
  return policy;
}
