import mongoose, { type Document, type Model, Schema } from 'mongoose';

export type OrderPaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';
export type OrderFulfillmentStatus = 'pending' | 'processing' | 'fulfilled' | 'canceled';
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'canceled' | 'refunded';

export interface OrderItemSnapshot {
  productId: string;
  slug: string;
  title: string;
  category: string;
  image: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderDocument extends Document {
  userId: string;
  clerkUserId: string;
  customerEmail?: string;
  customerName?: string;
  items: OrderItemSnapshot[];
  amount: number;
  currency: 'INR';
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
  receipt?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  webhookEventIds: string[];
  paidAt?: Date;
  failedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<OrderItemSnapshot>(
  {
    productId: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, default: 'General', trim: true },
    image: { type: String, default: '', trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderDocument>(
  {
    userId: { type: String, required: true, index: true },
    clerkUserId: { type: String, required: true, index: true },
    customerEmail: { type: String, default: '', lowercase: true, trim: true },
    customerName: { type: String, default: '', trim: true },
    items: { type: [orderItemSchema], default: [] },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['INR'], default: 'INR' },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'canceled', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'expired', 'refunded'],
      default: 'pending',
      index: true,
    },
    fulfillmentStatus: {
      type: String,
      enum: ['pending', 'processing', 'fulfilled', 'canceled'],
      default: 'pending',
      index: true,
    },
    receipt: { type: String, default: '', trim: true },
    stripeCheckoutSessionId: { type: String, trim: true, index: true, unique: true, sparse: true },
    stripePaymentIntentId: { type: String, trim: true, index: true, sparse: true },
    webhookEventIds: { type: [String], default: [] },
    paidAt: { type: Date },
    failedAt: { type: Date },
  },
  { timestamps: true },
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });

export const OrderModel: Model<OrderDocument> =
  mongoose.models.Order || mongoose.model<OrderDocument>('Order', orderSchema);
