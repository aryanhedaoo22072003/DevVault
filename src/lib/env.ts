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
};

export const hasMongoConfig = Boolean(env.mongoUri);
export const hasClerkConfig = Boolean(env.clerkPublishableKey && env.clerkSecretKey);
export const hasAdminConfig = /^user_[A-Za-z0-9]{8,}$/.test(env.ownerClerkUserId.trim());
