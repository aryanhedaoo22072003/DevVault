import { Readable } from 'node:stream';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { buildPublicPreviewFilter, privateStorage, sanitizeDownloadFilename } from '@/lib/private-storage';
import { DigitalAssetModel } from '@/models/digital-asset.model';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  if (!mongoose.isValidObjectId(assetId)) return Response.json({ error: 'Preview not found.' }, { status: 404 });
  await connectToDatabase();
  const asset = await DigitalAssetModel.findOne(buildPublicPreviewFilter(assetId)).lean();
  if (!asset?.storageKey) return Response.json({ error: 'Preview not found.' }, { status: 404 });
  try {
    const file = await privateStorage.open(asset.storageKey);
    const filename = sanitizeDownloadFilename(asset.originalFilename || `${asset.title}.bin`).replace(/"/g, '');
    return new Response(Readable.toWeb(file.stream) as ReadableStream, { headers: {
      'Content-Type': asset.mimeType || 'application/octet-stream',
      'Content-Length': String(file.size),
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=300, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    } });
  } catch {
    return Response.json({ error: 'Preview is temporarily unavailable.' }, { status: 404 });
  }
}
