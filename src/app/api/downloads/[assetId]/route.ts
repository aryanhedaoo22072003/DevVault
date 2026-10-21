import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';

import { syncUserProfile } from '@/lib/auth';
import { allowDownload } from '@/lib/download-rate-limit';
import { authorizeAssetDownload } from '@/lib/entitlements';
import { privateStorage, sanitizeDownloadFilename } from '@/lib/private-storage';
import { DownloadActivityModel } from '@/models/download-activity.model';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const session = await syncUserProfile();
  if (!session?.userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!allowDownload(session.userId)) return NextResponse.json({ error: 'Download rate limit exceeded. Try again shortly.' }, { status: 429, headers: { 'Retry-After': '60' } });

  const { assetId } = await params;
  const access = await authorizeAssetDownload(session.userId, assetId);
  if (!access) return NextResponse.json({ error: 'Download not found or not available for this account.' }, { status: 404 });

  try {
    const file = await privateStorage.open(access.asset.storageKey!);
    const filename = sanitizeDownloadFilename(access.asset.originalFilename || `${access.asset.title}.bin`);
    await DownloadActivityModel.create({
      userId: session.userId,
      orderId: access.order._id,
      productId: access.entitlement.productId,
      assetId: access.asset._id,
      downloadedAt: new Date(),
    });
    return new Response(Readable.toWeb(file.stream) as ReadableStream, {
      headers: {
        'Content-Type': access.asset.mimeType || 'application/octet-stream',
        'Content-Length': String(file.size),
        'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'The private file is temporarily unavailable.' }, { status: 404 });
  }
}
