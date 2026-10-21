import { productCatalog } from '@/data/catalog';
import { CategoryModel } from '@/models/category.model';
import { ProductModel } from '@/models/product.model';

import { connectToDatabase } from './db';
import { hasMongoConfig } from './env';
import { marketplaceQuerySchema } from './validators';

export type ProductListItem = {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  price: string;
  format: string;
  demoLabel: string;
  image: string;
  badge: string;
  featured?: boolean;
};

type ProductDocumentLike = object;

const PAGE_SIZE = 6;

function formatPriceInr(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function normalizeProductDocument(doc: ProductDocumentLike): ProductListItem {
  const record = doc as Record<string, unknown>;
  const title = typeof record.title === 'string' ? record.title : 'Untitled product';
  const category = typeof record.category === 'string' ? record.category : 'General';
  const rawPrice = Number(record.priceInr ?? 0);
  const image = typeof record.imageUrl === 'string'
    ? record.imageUrl
    : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80';

  return {
    id: String(record._id ?? title),
    slug: typeof record.slug === 'string' ? record.slug : title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title,
    category,
    description: typeof record.description === 'string' ? record.description : 'Premium digital resource for developers.',
    price: formatPriceInr(rawPrice),
    format: typeof record.format === 'string' ? record.format : 'Digital product',
    demoLabel: record.demoIncluded === false ? 'No demo' : 'Includes demo',
    image,
    badge: typeof record.badge === 'string' ? record.badge : 'New',
    featured: Boolean(record.featured),
  };
}

function applyStaticFilters(items: ProductListItem[], rawParams: Record<string, string | string[] | undefined>) {
  const params = marketplaceQuerySchema.parse(rawParams);
  const query = params.q.trim().toLowerCase();
  const category = params.category;
  const minPrice = params.minPrice;
  const maxPrice = params.maxPrice;

  let filtered = items.filter((product) => {
    const matchesQuery =
      !query ||
      product.title.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query);

    const basePrice = Number(product.price.replace(/[^\d]/g, ''));
    const matchesCategory = category === 'all' || product.category.toLowerCase() === category.toLowerCase();
    const matchesPrice = basePrice >= minPrice && basePrice <= maxPrice;

    return matchesQuery && matchesCategory && matchesPrice;
  });

  if (params.sort === 'price-low') {
    filtered = [...filtered].sort((a, b) => Number(a.price.replace(/[^\d]/g, '')) - Number(b.price.replace(/[^\d]/g, '')));
  }

  if (params.sort === 'price-high') {
    filtered = [...filtered].sort((a, b) => Number(b.price.replace(/[^\d]/g, '')) - Number(a.price.replace(/[^\d]/g, '')));
  }

  if (params.sort === 'title') {
    filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(params.page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;

  return {
    items: filtered.slice(start, start + PAGE_SIZE),
    totalItems,
    totalPages,
    currentPage,
    pageSize: PAGE_SIZE,
  };
}

export async function getMarketplaceProducts(rawParams: Record<string, string | string[] | undefined>) {
  const params = marketplaceQuerySchema.parse(rawParams);

  if (!hasMongoConfig) {
    return {
      ...applyStaticFilters(productCatalog, rawParams),
      source: 'seed' as const,
      error: null,
    };
  }

  try {
    await connectToDatabase();

    const query: Record<string, unknown> = { isPublished: true, status: 'published' };
    if (params.category && params.category !== 'all') {
      query.category = params.category;
    }

    if (params.q) {
      query.$or = [
        { title: { $regex: params.q, $options: 'i' } },
        { summary: { $regex: params.q, $options: 'i' } },
        { description: { $regex: params.q, $options: 'i' } },
        { tags: { $in: [new RegExp(params.q, 'i')] } },
      ];
    }

    if (params.minPrice || params.maxPrice) {
      query.priceInr = {
        $gte: params.minPrice,
        $lte: params.maxPrice,
      };
    }

    const totalItems = await ProductModel.countDocuments(query);
    const sortBy: Record<string, 1 | -1> =
      params.sort === 'price-low'
        ? { priceInr: 1 }
        : params.sort === 'price-high'
          ? { priceInr: -1 }
          : params.sort === 'title'
            ? { title: 1 }
            : { featured: -1, createdAt: -1 };

    const products = await ProductModel.find(query)
      .sort(sortBy)
      .skip((params.page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean();
    const items = products.map((product) => normalizeProductDocument(product));
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

    return {
      items,
      totalItems,
      totalPages,
      currentPage: Math.min(params.page, totalPages),
      pageSize: PAGE_SIZE,
      source: 'mongodb' as const,
      error: null,
    };
  } catch (error) {
    return {
      items: [],
      totalItems: 0,
      totalPages: 1,
      currentPage: 1,
      pageSize: PAGE_SIZE,
      source: 'mongodb' as const,
      error: error instanceof Error ? error.message : 'Unable to load marketplace products.',
    };
  }
}

export async function getMarketplaceProductBySlug(slug: string) {
  if (!slug) {
    return null;
  }

  if (!hasMongoConfig) {
    return productCatalog.find((product) => product.slug === slug) ?? null;
  }

  try {
    await connectToDatabase();
    const product = await ProductModel.findOne({ slug, isPublished: true, status: 'published' }).lean();
    if (!product) {
      return null;
    }

    return normalizeProductDocument(product);
  } catch {
    return null;
  }
}

export async function getAdminProducts() {
  if (!hasMongoConfig) {
    return productCatalog.map((product) => ({
      ...product,
      isPublished: true,
      productType: 'digital-product',
      status: 'published',
      priceInr: Number(product.price.replace(/[^\d]/g, '')),
    }));
  }

  try {
    await connectToDatabase();
    const products = await ProductModel.find({}).sort({ createdAt: -1 }).lean();

    return products.map((product) => ({
      id: String(product._id),
      slug: product.slug,
      title: product.title,
      category: product.category,
      description: product.description,
      summary: product.summary,
      price: formatPriceInr(Number(product.priceInr ?? 0)),
      priceInr: Number(product.priceInr ?? 0),
      format: product.format,
      demoLabel: product.demoIncluded ? 'Includes demo' : 'No demo',
      image: product.imageUrl,
      badge: product.badge,
      featured: Boolean(product.featured),
      isPublished: Boolean(product.isPublished),
      status: product.status ?? 'published',
      productType: product.productType,
      categorySlug: product.categorySlug,
      createdAt: product.createdAt,
    }));
  } catch {
    return productCatalog.map((product) => ({
      ...product,
      isPublished: true,
      productType: 'digital-product',
      status: 'published',
      priceInr: Number(product.price.replace(/[^\d]/g, '')),
    }));
  }
}

export async function getAdminDashboardStats() {
  if (!hasMongoConfig) {
    return {
      products: productCatalog.length,
      categories: 6,
      assets: 12,
    };
  }

  try {
    await connectToDatabase();
    const [products, categories, assets] = await Promise.all([
      ProductModel.countDocuments(),
      CategoryModel.countDocuments(),
      (await import('@/models/digital-asset.model')).DigitalAssetModel.countDocuments(),
    ]);

    return {
      products,
      categories,
      assets,
    };
  } catch {
    return {
      products: productCatalog.length,
      categories: 6,
      assets: 12,
    };
  }
}

export async function listCategoriesForAdmin() {
  if (!hasMongoConfig) {
    return [
      { id: 'product-engineering', name: 'Product Engineering', slug: 'product-engineering', categoryType: 'technology', description: 'SaaS product and platform resources.' },
      { id: 'ai-systems', name: 'AI Systems', slug: 'ai-systems', categoryType: 'technology', description: 'AI workflows and copilots.' },
      { id: 'learning', name: 'Learning', slug: 'learning', categoryType: 'topic', description: 'Developer education content.' },
    ];
  }

  try {
    await connectToDatabase();
    const categories = await CategoryModel.find({}).sort({ name: 1 }).lean();
    return categories.map((category) => ({
      id: String(category._id),
      name: category.name,
      slug: category.slug,
      categoryType: category.categoryType,
      description: category.description,
    }));
  } catch {
    return [
      { id: 'product-engineering', name: 'Product Engineering', slug: 'product-engineering', categoryType: 'technology', description: 'SaaS product and platform resources.' },
      { id: 'ai-systems', name: 'AI Systems', slug: 'ai-systems', categoryType: 'technology', description: 'AI workflows and copilots.' },
      { id: 'learning', name: 'Learning', slug: 'learning', categoryType: 'topic', description: 'Developer education content.' },
    ];
  }
}
