import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';

const SLUG = 'cloud-infra-playbook';
const FULL_NAME = 'cloud-infra-playbook-study-guide-v1.pdf';
const SAMPLE_NAME = 'cloud-infra-playbook-public-sample-v1.pdf';
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');

const root = path.resolve(process.cwd(), process.env.PRIVATE_STORAGE_ROOT ?? '.devvault-private');
const generated = path.resolve(root, 'generated', SLUG);

function privateTarget(key) {
  const target = path.resolve(root, key);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error('Refusing a path outside private storage.');
  return target;
}

async function inspect(filename, minimum, maximum = Number.MAX_SAFE_INTEGER) {
  const source = path.resolve(generated, filename);
  if (!source.startsWith(`${generated}${path.sep}`)) throw new Error('Invalid generated filename.');
  const contents = await fs.readFile(source);
  if (!contents.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error(`${filename} is not a PDF.`);
  if (contents.length < minimum || contents.length > maximum) throw new Error(`${filename} has an unexpected size.`);
  return {
    contents,
    size: contents.length,
    hash: crypto.createHash('sha256').update(contents).digest('hex'),
  };
}

async function store(productId, input) {
  const key = `${productId}/${crypto.randomUUID()}.pdf`;
  const target = privateTarget(key);
  await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  await fs.writeFile(target, input.contents, { mode: 0o600, flag: 'wx' });
  return { key, size: input.size };
}

await mongoose.connect(
  process.env.MONGODB_URI,
  process.env.MONGODB_DB ? { dbName: process.env.MONGODB_DB } : {},
);

const db = mongoose.connection.db;
try {
  const products = db.collection('products');
  const assets = db.collection('digitalassets');
  const [product, full, sample] = await Promise.all([
    products.findOne({ slug: SLUG }),
    inspect(FULL_NAME, 100_000),
    inspect(SAMPLE_NAME, 10_000, 5_242_880),
  ]);
  if (!product) throw new Error('Cloud Infra Playbook product not found.');
  if (product.priceInr !== 4899) throw new Error('Refusing to attach because the preserved price is unexpected.');
  if (full.hash === sample.hash) throw new Error('The public sample cannot equal the paid guide.');

  const [orderCount, entitlementCount] = await Promise.all([
    db.collection('orders').countDocuments({ 'items.productId': String(product._id) }),
    db.collection('entitlements').countDocuments({ productId: String(product._id) }),
  ]);
  if (orderCount || entitlementCount) {
    throw new Error('Existing purchases require the entitlement-aware replacement workflow.');
  }

  async function ensureAsset(title, filename, isPublic, input) {
    const existing = await assets.findOne({
      product: product._id,
      originalFilename: filename,
      isPublic,
      isActive: true,
    });
    if (existing) return { id: String(existing._id), created: false, bytes: existing.fileSize };

    const stored = await store(String(product._id), input);
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
      createdAt: now,
      updatedAt: now,
    });
    return { id: String(result.insertedId), created: true, bytes: stored.size };
  }

  const privateAsset = await ensureAsset(
    'Cloud Infra Playbook — Complete Operations Guide',
    FULL_NAME,
    false,
    full,
  );
  const previewAsset = await ensureAsset(
    'Cloud Infra Playbook — Public Sample',
    SAMPLE_NAME,
    true,
    sample,
  );

  const update = await products.updateOne(
    { _id: product._id, slug: SLUG, priceInr: 4899 },
    {
      $set: {
        description:
          'A professionally edited 36-page operations guide covering resilient cloud architecture, networking, identity, deployment strategies, observability, recovery, infrastructure as code, incident response, cost controls, and production readiness.',
        format: 'PDF operations guide',
        demoIncluded: true,
        includedItems: [
          '36-page Cloud Infra Playbook',
          'Twenty-five infrastructure and operations chapters',
          'Backup and recovery planning worksheet',
          'Incident-response runbook worksheet',
          'Production-readiness checklist',
          'Validated local shell and JSON examples',
          'Architecture diagrams, case studies, interview preparation, and revision material',
        ],
        intendedAudience: [
          'Developers moving applications toward production',
          'Junior cloud and platform engineers',
          'Technical interview candidates studying infrastructure fundamentals',
        ],
        prerequisites: [
          'Basic web application and command-line familiarity',
          'No cloud-provider certification required',
        ],
        updatedAt: new Date(),
      },
    },
  );
  if (update.matchedCount !== 1) throw new Error('Product metadata update failed.');

  console.log(
    JSON.stringify(
      {
        slug: SLUG,
        productId: String(product._id),
        priceInr: product.priceInr,
        privateAsset,
        previewAsset,
        fullHash: full.hash,
        sampleHash: sample.hash,
      },
      null,
      2,
    ),
  );
} finally {
  await mongoose.disconnect();
}
