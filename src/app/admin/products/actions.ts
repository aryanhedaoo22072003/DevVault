'use server';

import { revalidatePath } from 'next/cache';

import { requireAdminAccess } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { CategoryModel } from '@/models/category.model';
import { ProductModel } from '@/models/product.model';
import { DigitalAssetModel } from '@/models/digital-asset.model';
import { productFormSchema, categoryFormSchema } from '@/lib/validators';
import { privateStorage } from '@/lib/private-storage';
import { provisionPaidOrdersForProduct } from '@/lib/entitlements';

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'product';
}

async function ensureUniqueSlug(baseSlug: string) {
  let candidate = baseSlug;
  let offset = 1;

  while (await ProductModel.exists({ slug: candidate })) {
    candidate = `${baseSlug}-${offset}`;
    offset += 1;
  }

  return candidate;
}

export async function saveProductAction(formData: FormData) {
  await requireAdminAccess();

  const raw = {
    title: formData.get('title'),
    summary: formData.get('summary'),
    description: formData.get('description'),
    category: formData.get('category'),
    categorySlug: formData.get('categorySlug'),
    productType: formData.get('productType'),
    format: formData.get('format'),
    priceInr: formData.get('priceInr'),
    imageUrl: formData.get('imageUrl'),
    badge: formData.get('badge') ?? 'New',
    demoIncluded: formData.get('demoIncluded') === 'on',
    featured: formData.get('featured') === 'on',
    isPublished: formData.get('isPublished') === 'on',
    languages: formData.get('languages'),
    frameworks: formData.get('frameworks'),
    tags: formData.get('tags'),
    screenshots: formData.get('screenshots'),
  };

  const parsed = productFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const values = parsed.data;
  await connectToDatabase();

  const productId = formData.get('productId');
  const slug = await ensureUniqueSlug(slugify(values.title));

  if (productId && typeof productId === 'string' && productId.trim()) {
    await ProductModel.findByIdAndUpdate(productId, {
      ...values,
      slug: slugify(values.title),
      priceInr: Number(values.priceInr),
      categorySlug: values.categorySlug || slugify(values.category),
      languages: values.languages ? values.languages.split(',').map((entry) => entry.trim()).filter(Boolean) : [],
      frameworks: values.frameworks ? values.frameworks.split(',').map((entry) => entry.trim()).filter(Boolean) : [],
      tags: values.tags ? values.tags.split(',').map((entry) => entry.trim()).filter(Boolean) : [],
      screenshots: values.screenshots ? values.screenshots.split(',').map((entry) => entry.trim()).filter(Boolean) : [],
      status: values.isPublished ? 'published' : 'draft',
      isPublished: values.isPublished,
    });
  } else {
    await ProductModel.create({
      ...values,
      slug,
      priceInr: Number(values.priceInr),
      categorySlug: values.categorySlug || slugify(values.category),
      languages: values.languages ? values.languages.split(',').map((entry) => entry.trim()).filter(Boolean) : [],
      frameworks: values.frameworks ? values.frameworks.split(',').map((entry) => entry.trim()).filter(Boolean) : [],
      tags: values.tags ? values.tags.split(',').map((entry) => entry.trim()).filter(Boolean) : [],
      screenshots: values.screenshots ? values.screenshots.split(',').map((entry) => entry.trim()).filter(Boolean) : [],
      status: values.isPublished ? 'published' : 'draft',
      isPublished: values.isPublished,
    });
  }

  revalidatePath('/admin');
  revalidatePath('/admin/products');
  revalidatePath('/marketplace');

  return { success: true };
}

export async function toggleProductStatusAction(productId: string, isPublished: boolean) {
  await requireAdminAccess();
  await connectToDatabase();
  await ProductModel.findByIdAndUpdate(productId, {
    isPublished,
    status: isPublished ? 'published' : 'draft',
  });

  revalidatePath('/admin');
  revalidatePath('/admin/products');
  revalidatePath('/marketplace');
}

export async function deleteProductAction(productId: string) {
  await requireAdminAccess();
  await connectToDatabase();
  await ProductModel.findByIdAndDelete(productId);

  revalidatePath('/admin');
  revalidatePath('/admin/products');
  revalidatePath('/marketplace');
}

export async function saveCategoryAction(formData: FormData) {
  await requireAdminAccess();

  const raw = {
    name: formData.get('name'),
    description: formData.get('description'),
    slug: formData.get('slug'),
    categoryType: formData.get('categoryType') ?? 'technology',
    isPublic: formData.get('isPublic') === 'on',
  };

  const parsed = categoryFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  await connectToDatabase();
  const categoryId = formData.get('categoryId');
  const payload = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description,
    categoryType: parsed.data.categoryType,
    isPublic: parsed.data.isPublic,
  };

  if (categoryId && typeof categoryId === 'string' && categoryId.trim()) {
    await CategoryModel.findByIdAndUpdate(categoryId, payload);
  } else {
    await CategoryModel.create(payload);
  }

  revalidatePath('/admin');
  revalidatePath('/admin/categories');
  return { success: true };
}

export async function uploadProductAssetAction(formData: FormData) {
  await requireAdminAccess();
  const productId = String(formData.get('productId') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const file = formData.get('file');
  if (!productId || !title || !(file instanceof File)) throw new Error('Product, title, and private asset file are required.');

  await connectToDatabase();
  const product = await ProductModel.findById(productId).select('_id').lean();
  if (!product) throw new Error('Product not found.');
  const stored = await privateStorage.put(file, productId);
  const assetType = stored.mimeType === 'application/pdf' ? 'pdf' : stored.mimeType.includes('zip') ? 'zip' : 'other';
  await DigitalAssetModel.create({
    product: product._id,
    title,
    assetType,
    storageProvider: 'local-private',
    storageKey: stored.key,
    originalFilename: stored.filename,
    mimeType: stored.mimeType,
    fileSize: stored.size,
    isPublic: false,
    isActive: true,
  });
  await provisionPaidOrdersForProduct(productId);
  revalidatePath('/admin/products');
  revalidatePath('/dashboard/purchases');
}
