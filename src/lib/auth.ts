import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { UserProfileModel } from '@/models/user.model';

import { connectToDatabase } from './db';
import { hasClerkConfig, hasMongoConfig } from './env';

export function isAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  const normalized = email.trim().toLowerCase();
  return process.env.ADMIN_EMAILS?.split(',')
    .map((entry) => entry.trim().toLowerCase())
    .includes(normalized);
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
  const role = isAdminEmail(normalizedEmail) ? 'admin' : 'customer';

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
    { upsert: true, new: true, setDefaultsOnInsert: true },
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

  const email = session.profile?.email ?? session.user.emailAddresses?.[0]?.emailAddress ?? '';
  if (!isAdminEmail(email)) {
    redirect('/dashboard');
  }

  return session;
}
