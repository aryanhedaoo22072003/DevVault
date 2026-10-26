export const env = {
  mongoUri: process.env.MONGODB_URI ?? '',
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '',
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? '',
  ownerClerkUserId: process.env.DEVVAULT_OWNER_CLERK_USER_ID ?? '',
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  privateStorageRoot: process.env.PRIVATE_STORAGE_ROOT ?? '.devvault-private',
  maxPrivateAssetBytes: Number(process.env.MAX_PRIVATE_ASSET_BYTES ?? 52_428_800),
  storageProvider: process.env.PRIVATE_STORAGE_PROVIDER ?? 'local-private',
  s3Endpoint: process.env.S3_PRIVATE_ENDPOINT ?? '',
  s3Region: process.env.S3_PRIVATE_REGION ?? '',
  s3Bucket: process.env.S3_PRIVATE_BUCKET ?? '',
  s3Prefix: process.env.S3_PRIVATE_PREFIX ?? 'devvault-assets',
  s3ForcePathStyle: process.env.S3_PRIVATE_FORCE_PATH_STYLE === 'true',
  s3AccessKeyId: process.env.S3_PRIVATE_ACCESS_KEY_ID ?? '',
  s3SecretAccessKey: process.env.S3_PRIVATE_SECRET_ACCESS_KEY ?? '',
};

export const hasMongoConfig = Boolean(env.mongoUri);
export const hasClerkConfig = Boolean(env.clerkPublishableKey && env.clerkSecretKey);
export const hasAdminConfig = /^user_[A-Za-z0-9]{8,}$/.test(env.ownerClerkUserId.trim());

export function clerkAuthorizedParties(appUrl = env.appUrl) {
  try {
    const url = new URL(appUrl);
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if ((url.protocol !== 'https:' && !isLocal) || url.pathname !== '/' || url.search || url.hash) throw new Error();
    return [url.origin];
  } catch {
    // A configured allowlist is safer than silently disabling Clerk's azp check.
    // This deliberately matches no real deployment and therefore fails closed.
    return ['https://invalid.devvault.local'];
  }
}

export function protectedSignInUrl(requestUrl: string) {
  const request = new URL(requestUrl);
  const signIn = new URL('/sign-in', request.origin);
  signIn.searchParams.set('redirect_url', request.href);
  return signIn.toString();
}
