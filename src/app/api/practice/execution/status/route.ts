import { NextResponse } from 'next/server';
import { getExecutionAvailability } from '@/lib/execution-server';

export async function GET() {
  const status = await getExecutionAvailability();
  return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } });
}
