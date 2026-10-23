import mongoose, { type Model, Schema } from 'mongoose';
interface ExecutionRateLimit { key: string; count: number; expiresAt: Date }
const schema = new Schema<ExecutionRateLimit>({ key: { type: String, required: true, unique: true }, count: { type: Number, default: 0 }, expiresAt: { type: Date, required: true } });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const ExecutionRateLimitModel: Model<ExecutionRateLimit> = mongoose.models.ExecutionRateLimit || mongoose.model<ExecutionRateLimit>('ExecutionRateLimit', schema);
