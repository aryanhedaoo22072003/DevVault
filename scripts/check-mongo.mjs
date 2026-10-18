import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const contents = fs.readFileSync(envPath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value.replace(/^['"]|['"]$/g, '');
    }
  }
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.log('MONGODB_URI_present=false');
  process.exit(1);
}

const dbName = new URL(uri).pathname.replace(/^\//, '');
console.log('MONGODB_URI_present=true');
console.log('DB_NAME_EXPLICIT=' + Boolean(dbName));
console.log('DB_NAME=' + (dbName || 'missing'));

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log('MONGODB_CONNECT=success');
  await mongoose.connection.db.admin().ping();
  console.log('MONGODB_PING=success');
  const dbs = await mongoose.connection.db.admin().listDatabases({ nameOnly: true });
  console.log('DATABASES_FOUND=' + dbs.databases.length);
  await mongoose.disconnect();
} catch (error) {
  console.log('MONGODB_CONNECT=fail');
  console.log('ERROR_NAME=' + (error && error.name ? error.name : 'unknown'));
  console.log('ERROR_MESSAGE=' + (error && error.message ? error.message.replace(/[A-Za-z0-9:._@-]{4,}/g, '[redacted]') : 'unknown'));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => undefined);
}
