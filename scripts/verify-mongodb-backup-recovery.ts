import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import mongoose from 'mongoose';

const archive = '.devvault-backups/20261025-pre-r2-migration/mongodb.archive.gz';
const sourceDatabase = process.env.MONGODB_DB;
const uri = process.env.MONGODB_URI;
const recoveryDatabase = `dvr_${randomUUID().replaceAll('-', '').slice(0, 20)}`;

async function main() {
  if (!uri || !sourceDatabase) throw new Error('MongoDB recovery configuration is missing.');
  const restore = spawnSync('mongorestore', [
    '--uri', uri,
    `--archive=${archive}`,
    '--gzip',
    `--nsFrom=${sourceDatabase}.*`,
    `--nsTo=${recoveryDatabase}.*`,
  ], { encoding: 'utf8' });
  if (restore.status !== 0) {
    const cleanup = await mongoose.createConnection(uri, { dbName: recoveryDatabase }).asPromise();
    try {
      await cleanup.dropDatabase();
    } finally {
      await cleanup.close();
    }
    throw new Error(`Isolated restore failed: ${restore.stderr.trim() || 'mongorestore exited unsuccessfully'}`);
  }

  const connection = await mongoose.createConnection(uri, { dbName: recoveryDatabase }).asPromise();
  try {
    const db = connection.db;
    if (!db) throw new Error('Recovery database connection is unavailable.');
    const [products, assets, orders, entitlements, downloads, progress] = await Promise.all([
      db.collection('products').find({}).project({ _id: 1 }).toArray(),
      db.collection('digitalassets').find({}).project({ _id: 1, product: 1, isActive: 1, isPublic: 1 }).toArray(),
      db.collection('orders').find({}).project({ _id: 1, items: 1 }).toArray(),
      db.collection('entitlements').find({}).project({ orderId: 1, productId: 1, assetIds: 1 }).toArray(),
      db.collection('downloadactivities').find({}).project({ _id: 1 }).toArray(),
      db.collection('studentlearningprogresses').find({}).project({ xp: 1 }).toArray(),
    ]);
    const productIds = new Set(products.map((entry) => String(entry._id)));
    const assetIds = new Set(assets.map((entry) => String(entry._id)));
    const orderIds = new Set(orders.map((entry) => String(entry._id)));
    const assetProductsValid = assets.every((entry) => productIds.has(String(entry.product)));
    const orderProductsValid = orders.every((order) => (order.items as Array<{ productId: string }>).every((item) => productIds.has(item.productId)));
    const entitlementRelationsValid = entitlements.every((entry) => orderIds.has(String(entry.orderId)) && productIds.has(String(entry.productId)) && (entry.assetIds as mongoose.Types.ObjectId[]).every((assetId) => assetIds.has(String(assetId))));
    const report = {
      products: products.length,
      assets: assets.length,
      activePrivateAssets: assets.filter((entry) => entry.isActive && !entry.isPublic).length,
      activePublicPreviews: assets.filter((entry) => entry.isActive && entry.isPublic).length,
      inactiveAssets: assets.filter((entry) => !entry.isActive).length,
      orders: orders.length,
      entitlements: entitlements.length,
      downloads: downloads.length,
      progressRecords: progress.length,
      xpTotal: progress.reduce((sum, entry) => sum + Number(entry.xp ?? 0), 0),
      assetProductsValid,
      orderProductsValid,
      entitlementRelationsValid,
    };
    if (report.products !== 7 || report.assets !== 21 || report.orders !== 4 || report.entitlements !== 3 || report.downloads !== 3 || !assetProductsValid || !orderProductsValid || !entitlementRelationsValid) throw new Error('Recovered data failed integrity checks.');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await connection.dropDatabase();
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Recovery drill failed.');
  process.exitCode = 1;
});
