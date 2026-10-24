import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { accountCapabilities } from '@/lib/auth';

export async function GET() {
  const { userId } = await auth();
  return NextResponse.json(accountCapabilities(userId), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
