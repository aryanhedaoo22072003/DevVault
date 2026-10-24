import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';

const PRODUCT_SLUG = 'data-pipeline-patterns';
const FULLSTACK_SLUG = 'full-stack-starter-kit';
const FULL_NAME = 'data-pipeline-patterns-study-guide-v1.1.pdf';
const SAMPLE_NAME = 'data-pipeline-patterns-public-sample-v1.1.pdf';

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
const root = path.resolve(process.cwd(), process.env.PRIVATE_STORAGE_ROOT ?? '.devvault-private');
const generated = path.resolve(root, 'generated', PRODUCT_SLUG);

function resolveInsideRoot(...parts) {
  const target = path.resolve(root, ...parts);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error('Refusing a path outside private storage.');
  return target;
}

async function inspectPdf(filename, minimumBytes, maximumBytes = Number.MAX_SAFE_INTEGER) {
  const source = path.resolve(generated, filename);
  if (!source.startsWith(`${generated}${path.sep}`)) throw new Error('Invalid generated filename.');
  const contents = await fs.readFile(source);
  if (!contents.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error(`${filename} is not a PDF.`);
  if (contents.length < minimumBytes || contents.length > maximumBytes) throw new Error(`${filename} has an unexpected size.`);
  return { source, contents, size: contents.length, sha256: crypto.createHash('sha256').update(contents).digest('hex') };
}

async function storePdf(productId, input) {
  const key = `${productId}/${crypto.randomUUID()}.pdf`;
  const target = resolveInsideRoot(key);
  await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  await fs.writeFile(target, input.contents, { mode: 0o600, flag: 'wx' });
  return { key, size: input.size };
}

await mongoose.connect(process.env.MONGODB_URI, process.env.MONGODB_DB ? { dbName: process.env.MONGODB_DB } : {});
const db = mongoose.connection.db;
const products = db.collection('products');
const assets = db.collection('digitalassets');

try {
  const [product, fullStack, full, sample] = await Promise.all([
    products.findOne({ slug: PRODUCT_SLUG }),
    products.findOne({ slug: FULLSTACK_SLUG }),
    inspectPdf(FULL_NAME, 100_000),
    inspectPdf(SAMPLE_NAME, 10_000, 5_242_880),
  ]);
  if (!product || !fullStack) throw new Error('Expected marketplace products were not found.');
  if (full.sha256 === sample.sha256) throw new Error('Public sample must not match the paid guide.');

  const paidOrders = await db.collection('orders').countDocuments({ paymentStatus: 'paid', 'items.productId': String(product._id) });
  if (paidOrders > 0) throw new Error('Data Pipeline Patterns has paid orders; use the entitlement-aware admin workflow instead.');

  async function ensureAsset({ title, filename, isPublic, input }) {
    const existing = await assets.findOne({ product: product._id, originalFilename: filename, isPublic, isActive: true });
    if (existing) return { id: String(existing._id), created: false, size: existing.fileSize };
    const previous = await assets.findOne({ product: product._id, isPublic, isActive: true }, { sort: { createdAt: -1 } });
    const stored = await storePdf(String(product._id), input);
    const now = new Date();
    const result = await assets.insertOne({
      product: product._id,
      title,
      assetType: 'pdf',
      url: '',
      storageProvider: 'local-private',
      storageKey: stored.key,
      originalFilename: filename,
      mimeType: 'application/pdf',
      thumbnailUrl: '',
      fileSize: stored.size,
      version: '1.0.0',
      isPublic,
      isActive: true,
      ...(previous ? { replacesAssetId: previous._id } : {}),
      createdAt: now,
      updatedAt: now,
    });
    if (previous) {
      await assets.updateOne(
        { _id: previous._id, isActive: true },
        { $set: { isActive: false, replacedByAssetId: result.insertedId, replacedAt: now, updatedAt: now } },
      );
    }
    return { id: String(result.insertedId), created: true, size: stored.size };
  }

  const privateAsset = await ensureAsset({ title: 'Data Pipeline Patterns — Complete Study Guide', filename: FULL_NAME, isPublic: false, input: full });
  const previewAsset = await ensureAsset({ title: 'Data Pipeline Patterns — Public Sample', filename: SAMPLE_NAME, isPublic: true, input: sample });

  const productUpdate = await products.updateOne({ _id: product._id, slug: PRODUCT_SLUG }, { $set: {
    description: 'A professionally edited 28-page study guide to reliable data pipeline architecture, incremental processing, data quality, reconciliation, recovery, warehouse history, case studies, and interview preparation.',
    format: 'PDF study guide',
    demoIncluded: true,
    includedItems: [
      '28-page Data Pipeline Patterns study guide',
      'Validated SQLite transformation and reconciliation examples',
      'Validated Python rejection-handling example',
      'Architecture diagrams and process flowcharts',
      'Employee ETL and incremental customer case studies',
      'Exercises, interview answers, revision checklist, and glossary',
    ],
    intendedAudience: ['Data engineering students', 'Junior data engineers', 'ETL developers preparing for interviews'],
    prerequisites: ['Basic SQL familiarity', 'Basic Python familiarity is helpful but not required'],
    updatedAt: new Date(),
  } });
  if (productUpdate.matchedCount !== 1) throw new Error('Data Pipeline Patterns metadata was not updated.');

  const fullStackUpdate = await products.updateOne(
    { _id: fullStack._id, slug: FULLSTACK_SLUG },
    { $set: { status: 'draft', isPublished: false, updatedAt: new Date() } },
  );
  if (fullStackUpdate.matchedCount !== 1) throw new Error('Full-Stack Starter Kit was not moved to draft.');

  console.log(JSON.stringify({
    product: { slug: PRODUCT_SLUG, id: String(product._id), priceInr: product.priceInr, privateAsset, previewAsset },
    fullSha256: full.sha256,
    sampleSha256: sample.sha256,
    fullStack: { slug: FULLSTACK_SLUG, status: 'draft', historicalAssetPreserved: true },
  }, null, 2));
} finally {
  await mongoose.disconnect();
}
