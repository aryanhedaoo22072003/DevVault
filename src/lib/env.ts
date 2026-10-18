export const env = {
  mongoUri: process.env.MONGODB_URI ?? '',
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '',
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? '',
  adminEmails: (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean),
  razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
};

export const hasMongoConfig = Boolean(env.mongoUri);
export const hasClerkConfig = Boolean(env.clerkPublishableKey && env.clerkSecretKey);
export const hasAdminConfig = env.adminEmails.length > 0;
export const hasRazorpayConfig = Boolean(env.razorpayKeyId && env.razorpayKeySecret);
