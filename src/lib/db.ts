import mongoose from 'mongoose';

const globalForMongoose = globalThis as typeof globalThis & {
  mongoose?: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
};

export async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  const mongoDbName = process.env.MONGODB_DB;

  if (!mongoUri) {
    return null;
  }

  if (globalForMongoose.mongoose?.conn) {
    return globalForMongoose.mongoose.conn;
  }

  if (!globalForMongoose.mongoose) {
    globalForMongoose.mongoose = { conn: null, promise: null };
  }

  if (!globalForMongoose.mongoose.promise) {
    const connectOptions = mongoDbName ? { dbName: mongoDbName } : {};
    globalForMongoose.mongoose.promise = mongoose.connect(mongoUri, connectOptions).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    globalForMongoose.mongoose.conn = await globalForMongoose.mongoose.promise;
  } catch (error) {
    globalForMongoose.mongoose.promise = null;
    throw error;
  }

  return globalForMongoose.mongoose.conn;
}
