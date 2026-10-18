import { z } from 'zod';

export const productFormSchema = z.object({
  title: z.string().trim().min(3, 'Product title must be at least 3 characters.'),
  summary: z.string().trim().min(12, 'Summary must be at least 12 characters long.'),
  description: z.string().trim().min(30, 'Description must be at least 30 characters long.'),
  category: z.string().trim().min(2, 'Category is required.'),
  categorySlug: z.string().trim().optional().default(''),
  productType: z.enum(['digital-product', 'course', 'template', 'bundle', 'practice-lab']).default('digital-product'),
  format: z.string().trim().min(2, 'Format is required.'),
  priceInr: z.coerce.number().int().min(0, 'Price must be zero or more.'),
  imageUrl: z.string().trim().url('Image URL must be a valid URL.'),
  badge: z.string().trim().default('New'),
  demoIncluded: z.coerce.boolean().default(true),
  featured: z.coerce.boolean().default(false),
  isPublished: z.coerce.boolean().default(true),
  languages: z.string().trim().optional().default(''),
  frameworks: z.string().trim().optional().default(''),
  tags: z.string().trim().optional().default(''),
  screenshots: z.string().trim().optional().default(''),
});

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters.'),
  description: z.string().trim().min(10, 'Category description must be at least 10 characters.'),
  slug: z.string().trim().min(2, 'Category slug must be at least 2 characters.'),
  categoryType: z.enum(['technology', 'topic', 'bundle']).default('technology'),
  isPublic: z.coerce.boolean().default(true),
});

export const marketplaceQuerySchema = z.object({
  q: z.string().optional().default(''),
  category: z.string().optional().default('all'),
  sort: z.enum(['featured', 'price-low', 'price-high', 'title']).optional().default('featured'),
  page: z.coerce.number().int().min(1).optional().default(1),
  minPrice: z.coerce.number().int().min(0).optional().default(0),
  maxPrice: z.coerce.number().int().min(0).optional().default(500000),
});
