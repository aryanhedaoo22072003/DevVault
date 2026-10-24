import mongoose, { type Document, type Model, Schema } from 'mongoose';

export interface PlaygroundDraftDocument extends Document {
  clerkUserId: string;
  workspace: string;
  language: 'sql' | 'typescript' | 'c' | 'cpp' | 'java';
  code: string;
  createdAt: Date;
  updatedAt: Date;
}

const playgroundDraftSchema = new Schema<PlaygroundDraftDocument>({
  clerkUserId: { type: String, required: true, trim: true },
  workspace: { type: String, required: true, trim: true, maxlength: 120 },
  language: { type: String, enum: ['sql', 'typescript', 'c', 'cpp', 'java'], required: true },
  code: { type: String, required: true, maxlength: 30_000 },
}, { timestamps: true });

playgroundDraftSchema.index({ clerkUserId: 1, workspace: 1, language: 1 }, { unique: true });
playgroundDraftSchema.index({ clerkUserId: 1, updatedAt: -1 });

export const PlaygroundDraftModel: Model<PlaygroundDraftDocument> = mongoose.models.PlaygroundDraft || mongoose.model<PlaygroundDraftDocument>('PlaygroundDraft', playgroundDraftSchema);
