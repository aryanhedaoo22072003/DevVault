import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';

const SLUG = 'security-review-templates';
const root = path.resolve(process.cwd(), process.env.PRIVATE_STORAGE_ROOT ?? '.devvault-private');
const generated = path.resolve(root, 'generated', SLUG);
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');

const definitions = [
  { filename: 'security-review-templates-editable-pack-v1.zip', title: 'Security Review Templates — Editable Pack', type: 'zip', mime: 'application/zip', public: false, minimum: 10_000 },
  { filename: 'security-review-templates-companion-guide-v1.pdf', title: 'Security Review Templates — Companion Guide', type: 'pdf', mime: 'application/pdf', public: false, minimum: 50_000 },
  { filename: 'security-review-templates-public-sample-v1.pdf', title: 'Security Review Templates — Public Sample', type: 'pdf', mime: 'application/pdf', public: true, minimum: 10_000 },
];

function safeTarget(key) {
  const target = path.resolve(root, key);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error('Refusing a path outside private storage.');
  return target;
}

async function inspect(definition) {
  const source = path.resolve(generated, definition.filename);
  if (!source.startsWith(`${generated}${path.sep}`)) throw new Error('Invalid generated filename.');
  const contents = await fs.readFile(source);
  const valid = definition.type === 'pdf'
    ? contents.subarray(0, 5).equals(Buffer.from('%PDF-'))
    : contents.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  if (!valid || contents.length < definition.minimum) throw new Error(`${definition.filename} failed format or size validation.`);
  return { ...definition, contents, size: contents.length, hash: crypto.createHash('sha256').update(contents).digest('hex') };
}

await mongoose.connect(process.env.MONGODB_URI, process.env.MONGODB_DB ? { dbName: process.env.MONGODB_DB } : {});
const db = mongoose.connection.db;
try {
  const products = db.collection('products');
  const assets = db.collection('digitalassets');
  const product = await products.findOne({ slug: SLUG });
  if (!product) throw new Error('Security Review Templates product not found.');
  if (product.priceInr !== 4299) throw new Error('Refusing to attach because the preserved price is unexpected.');
  const [orderCount, entitlementCount] = await Promise.all([
    db.collection('orders').countDocuments({ 'items.productId': String(product._id) }),
    db.collection('entitlements').countDocuments({ productId: String(product._id) }),
  ]);
  if (orderCount || entitlementCount) throw new Error('Existing purchases require the entitlement-aware replacement workflow.');

  const inputs = await Promise.all(definitions.map(inspect));
  if (new Set(inputs.map((input) => input.hash)).size !== inputs.length) throw new Error('Paid and preview files must be distinct.');
  const results = [];
  for (const input of inputs) {
    const existing = await assets.findOne({ product: product._id, originalFilename: input.filename, isPublic: input.public, isActive: true });
    if (existing) {
      results.push({ id: String(existing._id), filename: input.filename, public: input.public, created: false, bytes: existing.fileSize, hash: input.hash });
      continue;
    }
    const key = `${product._id}/${crypto.randomUUID()}.${input.type}`;
    const target = safeTarget(key);
    await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    await fs.writeFile(target, input.contents, { mode: 0o600, flag: 'wx' });
    const now = new Date();
    const inserted = await assets.insertOne({ product: product._id, title: input.title, assetType: input.type, url: '', storageProvider: 'local-private', storageKey: key, originalFilename: input.filename, mimeType: input.mime, thumbnailUrl: '', fileSize: input.size, version: '1.0.0', isPublic: input.public, isActive: true, createdAt: now, updatedAt: now });
    results.push({ id: String(inserted.insertedId), filename: input.filename, public: input.public, created: true, bytes: input.size, hash: input.hash });
  }

  const update = await products.updateOne({ _id: product._id, slug: SLUG, priceInr: 4299 }, { $set: {
    description: 'A reusable security-review toolkit with sixteen editable Markdown and CSV templates, a 19-page companion guide, worked application-review examples, risk and remediation tracking, release sign-off, and incident-readiness guidance.',
    format: 'ZIP template pack + PDF guide', demoIncluded: true,
    includedItems: ['Sixteen editable security-review templates', 'Markdown checklists and worksheets', 'CSV asset, risk, and remediation trackers', 'Machine-readable JSON manifest', '19-page companion guide', 'Threat-modeling and risk-prioritization guidance', 'Worked private-download and API-release reviews', 'Limited public sample PDF'],
    intendedAudience: ['Application developers and technical leads', 'Security reviewers and platform engineers', 'Teams preparing production release decisions'],
    prerequisites: ['Basic familiarity with web applications and APIs', 'Access to system owners and safe review evidence'],
    updatedAt: new Date(),
  } });
  if (update.matchedCount !== 1) throw new Error('Product metadata update failed.');
  console.log(JSON.stringify({ slug: SLUG, productId: String(product._id), priceInr: product.priceInr, assets: results }, null, 2));
} finally {
  await mongoose.disconnect();
}
