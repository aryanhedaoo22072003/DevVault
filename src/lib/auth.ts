import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { UserProfileModel } from '@/models/user.model';

import { connectToDatabase } from './db';
import { hasClerkConfig, hasMongoConfig } from './env';

export function isValidOwnerClerkUserId(value: string | null | undefined) {
  return typeof value === 'string' && /^user_[A-Za-z0-9]{8,}$/.test(value.trim());
}

export function isOwnerClerkUserId(userId: string | null | undefined, configuredOwnerId = process.env.DEVVAULT_OWNER_CLERK_USER_ID) {
  if (!userId || !isValidOwnerClerkUserId(configuredOwnerId)) return false;
  return userId === configuredOwnerId!.trim();
}

export function accountCapabilities(userId: string | null | undefined, configuredOwnerId = process.env.DEVVAULT_OWNER_CLERK_USER_ID) {
  const student = Boolean(userId);
  return { student, admin: student && isOwnerClerkUserId(userId, configuredOwnerId) };
}

export async function syncUserProfile() {
  if (!hasClerkConfig || !hasMongoConfig) {
    return null;
  }

  await connectToDatabase();

  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return null;
  }

  const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress ?? '';
  const normalizedEmail = primaryEmail.trim().toLowerCase();
  // This persisted role is informational only. Authorization always compares the
  // authenticated Clerk user ID with the private owner configuration.
  const role = isOwnerClerkUserId(userId) ? 'admin' : 'customer';

  const profile = await UserProfileModel.findOneAndUpdate(
    { clerkId: userId },
    {
      clerkId: userId,
      name: clerkUser.fullName ?? clerkUser.firstName ?? 'Developer',
      email: normalizedEmail,
      avatarUrl: clerkUser.imageUrl ?? '',
      role,
      isOnboarded: true,
      lastLoginAt: new Date(),
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  ).lean();

  return {
    userId,
    user: clerkUser,
    profile,
  };
}

export async function requireAuthenticatedUser() {
  const session = await syncUserProfile();

  if (!session) {
    redirect('/sign-in');
  }

  return session;
}

export async function requireAdminAccess() {
  const session = await requireAuthenticatedUser();
  if (!isOwnerClerkUserId(session.userId)) {
    redirect('/dashboard');
  }

  return session;
}
