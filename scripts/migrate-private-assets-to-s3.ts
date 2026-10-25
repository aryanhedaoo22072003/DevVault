import mongoose from 'mongoose';

import { connectToDatabase } from '../src/lib/db';
import { env } from '../src/lib/env';
import { privateStorage } from '../src/lib/private-storage';
import { checksumsMatch, mayApplyStorageMigration, streamToVerifiedBuffer } from '../src/lib/storage-migration';
import { DigitalAssetModel } from '../src/models/digital-asset.model';

const apply = process.argv.includes('--apply');
const confirmation = process.argv.find((value) => value.startsWith('--confirm='))?.slice('--confirm='.length);

async function main() {
  if (!env.mongoUri) throw new Error('MONGODB_URI is required.');
  const canApply = mayApplyStorageMigration({ apply, confirmation, provider: env.storageProvider });
  await connectToDatabase();
  const before = {
    assets: await DigitalAssetModel.countDocuments({}),
    local: await DigitalAssetModel.countDocuments({ storageProvider: 'local-private' }),
    remote: await DigitalAssetModel.countDocuments({ storageProvider: 's3-private' }),
  };
  const assets = await DigitalAssetModel.find({ storageProvider: 'local-private', storageKey: { $nin: ['', null] } })
    .select('_id product storageKey fileSize mimeType isActive isPublic')
    .sort({ _id: 1 });
  const result = { mode: canApply ? 'apply' : 'dry-run', scanned: assets.length, verifiedLocal: 0, migrated: 0, alreadyRemote: before.remote, failed: 0, aggregateChecksum: '' };
  const sourceChecksums: string[] = [];

  for (const asset of assets) {
    try {
      const local = await privateStorage.open(asset.storageKey!, 'local-private', { expectedSize: asset.fileSize, expectedMimeType: asset.mimeType });
      const source = await streamToVerifiedBuffer(local.stream, asset.fileSize);
      sourceChecksums.push(source.checksumSha256);
      result.verifiedLocal += 1;
      if (!canApply) continue;

      let remoteChecksum = '';
      if (await privateStorage.exists(asset.storageKey!, 's3-private', { expectedSize: asset.fileSize, expectedMimeType: asset.mimeType })) {
        const remote = await privateStorage.open(asset.storageKey!, 's3-private', { expectedSize: asset.fileSize, expectedMimeType: asset.mimeType });
        remoteChecksum = (await streamToVerifiedBuffer(remote.stream, asset.fileSize)).checksumSha256;
      } else {
        await privateStorage.putBuffer(asset.storageKey!, source.body, asset.mimeType!, 's3-private');
        const remote = await privateStorage.open(asset.storageKey!, 's3-private', { expectedSize: asset.fileSize, expectedMimeType: asset.mimeType });
        remoteChecksum = (await streamToVerifiedBuffer(remote.stream, asset.fileSize)).checksumSha256;
      }
      if (!checksumsMatch(source.checksumSha256, remoteChecksum)) throw new Error('Remote checksum differs from local source.');

      const update = await DigitalAssetModel.updateOne(
        { _id: asset._id, storageProvider: 'local-private', storageKey: asset.storageKey },
        { $set: { storageProvider: 's3-private' } },
      );
      if (update.modifiedCount === 1) result.migrated += 1;
    } catch (error) {
      result.failed += 1;
      console.error(`Asset ${String(asset._id)} failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  const aggregate = await import('node:crypto').then(({ createHash }) => createHash('sha256').update(sourceChecksums.sort().join('\n')).digest('hex'));
  result.aggregateChecksum = aggregate;
  const after = {
    assets: await DigitalAssetModel.countDocuments({}),
    local: await DigitalAssetModel.countDocuments({ storageProvider: 'local-private' }),
    remote: await DigitalAssetModel.countDocuments({ storageProvider: 's3-private' }),
  };
  console.log(JSON.stringify({ before, result, after }, null, 2));
  if (before.assets !== after.assets || (!canApply && (before.local !== after.local || before.remote !== after.remote))) throw new Error('Data-preservation invariant failed.');
  if (result.failed) process.exitCode = 1;
}

main().catch((error) => { console.error(error instanceof Error ? error.message : 'Migration failed.'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
