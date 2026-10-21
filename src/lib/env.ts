export const env = {
  mongoUri: process.env.MONGODB_URI ?? '',
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '',
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? '',
  adminEmails: (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean),
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  privateStorageRoot: process.env.PRIVATE_STORAGE_ROOT ?? '.devvault-private',
  maxPrivateAssetBytes: Number(process.env.MAX_PRIVATE_ASSET_BYTES ?? 52_428_800),
};

export const hasMongoConfig = Boolean(env.mongoUri);
export const hasClerkConfig = Boolean(env.clerkPublishableKey && env.clerkSecretKey);
export const hasAdminConfig = env.adminEmails.length > 0;
