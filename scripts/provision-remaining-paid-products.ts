import { connectToDatabase } from '@/lib/db';
import { provisionPaidOrdersForProduct } from '@/lib/entitlements';
import { ProductModel } from '@/models/product.model';
import mongoose from 'mongoose';

const slugs = ['ai-copilot-workflow-pack', 'full-stack-starter-kit'];
async function main() {
  await connectToDatabase();
  try {
    for (const slug of slugs) {
      const product = await ProductModel.findOne({ slug }).select('_id slug').lean();
      if (!product) throw new Error(`Product not found: ${slug}`);
      await provisionPaidOrdersForProduct(String(product._id));
      console.log(JSON.stringify({ slug, provisionedPaidOrders: true }));
    }
  } finally {
    await mongoose.disconnect();
  }
}

void main();
