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
import { productHasOrders } from '@/lib/admin';
import { LearningPathModel } from '@/models/learning-content.model';
import { learningLessonSchema } from '@/lib/validators';

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'product';
}

async function ensureUniqueSlug(baseSlug: string, excludeId?: string) {
  let candidate = baseSlug;
  let offset = 1;

  while (await ProductModel.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
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
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid product data.');
  }

  const values = parsed.data;
  await connectToDatabase();

  const productId = formData.get('productId');
  const requestedProductId = typeof productId === 'string' ? productId.trim() : '';
  const slug = await ensureUniqueSlug(slugify(values.title), requestedProductId || undefined);

  if (productId && typeof productId === 'string' && productId.trim()) {
    await ProductModel.findByIdAndUpdate(productId, {
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

export async function archiveProductAction(productId: string) {
  await requireAdminAccess();
  await connectToDatabase();
  await ProductModel.findByIdAndUpdate(productId, { isPublished: false, status: 'archived' });
  revalidatePath('/admin');
  revalidatePath('/admin/products');
  revalidatePath('/marketplace');
}

export async function deleteProductAction(productId: string) {
  await requireAdminAccess();
  await connectToDatabase();
  if (await productHasOrders(productId)) throw new Error('Products referenced by orders cannot be deleted. Archive the product instead.');
  const assetCount = await DigitalAssetModel.countDocuments({ product: productId });
  if (assetCount > 0) throw new Error('Products with private assets cannot be deleted. Archive the product instead.');
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
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid category data.');
  }

  await connectToDatabase();
  const categoryId = formData.get('categoryId');
  const duplicate = await CategoryModel.exists({ slug: parsed.data.slug, ...(typeof categoryId === 'string' && categoryId ? { _id: { $ne: categoryId } } : {}) });
  if (duplicate) throw new Error('A category with this slug already exists.');
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
}

export async function toggleCategoryAction(categoryId: string, isPublic: boolean) {
  await requireAdminAccess();
  await connectToDatabase();
  await CategoryModel.findByIdAndUpdate(categoryId, { isPublic });
  revalidatePath('/admin/categories');
  revalidatePath('/marketplace');
}

export async function deleteCategoryAction(categoryId: string) {
  await requireAdminAccess();
  await connectToDatabase();
  const category = await CategoryModel.findById(categoryId).select('name slug').lean();
  if (!category) return;
  const used = await ProductModel.exists({ $or: [{ categorySlug: category.slug }, { category: category.name }] });
  if (used) throw new Error('This category is referenced by products and cannot be deleted. Deactivate it instead.');
  await CategoryModel.findByIdAndDelete(categoryId);
  revalidatePath('/admin/categories');
}

export async function toggleAssetAction(assetId: string, isActive: boolean) {
  await requireAdminAccess();
  await connectToDatabase();
  const asset = await DigitalAssetModel.findByIdAndUpdate(assetId, { isActive }, { returnDocument: 'after' }).select('product').lean();
  if (!asset) throw new Error('Asset not found.');
  await provisionPaidOrdersForProduct(String(asset.product));
  revalidatePath('/admin/assets');
  revalidatePath('/admin/products');
  revalidatePath('/dashboard/purchases');
}

export async function saveLearningContentAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = learningLessonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid learning content.');
  await connectToDatabase();
  const value = parsed.data;
  const lessonSlug = slugify(value.title);
  const pathSlug = slugify(value.pathTitle);
  const lesson = {
    title: value.title, slug: lessonSlug, order: 0, markdown: value.markdown,
    codeExamples: value.code ? [{ language: value.codeLanguage || 'text', code: value.code }] : [],
    flowcharts: value.flowchart ? [{ title: `${value.title} flowchart`, definition: value.flowchart }] : [],
    quizQuestions: [], exercises: value.exercise ? [{ title: `${value.title} exercise`, instructions: value.exercise, starterCode: '', language: value.codeLanguage || 'text' }] : [],
    status: value.status,
  };
  if (value.pathId) {
    await LearningPathModel.findByIdAndUpdate(value.pathId, { title: value.pathTitle, slug: pathSlug, subject: value.subject, description: value.description, status: value.status, modules: [{ title: 'Module 1', slug: 'module-1', order: 0, lessons: [lesson] }] });
  } else {
    if (await LearningPathModel.exists({ slug: pathSlug })) throw new Error('A learning path with this slug already exists.');
    await LearningPathModel.create({ title: value.pathTitle, slug: pathSlug, subject: value.subject, description: value.description, status: value.status, modules: [{ title: 'Module 1', slug: 'module-1', order: 0, lessons: [lesson] }] });
  }
  revalidatePath('/admin/learning');
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
