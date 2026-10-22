import { afterEach, describe, expect, it } from 'vitest';

import { isAdminEmail } from '@/lib/auth';
import { escapeRegExp, fillSalesTrend, paidRevenuePipeline, safePage, topProductsPipeline } from '@/lib/admin';
import { categoryFormSchema, learningLessonSchema, productFormSchema } from '@/lib/validators';

const originalAdminEmails = process.env.ADMIN_EMAILS;
afterEach(() => { if (originalAdminEmails === undefined) delete process.env.ADMIN_EMAILS; else process.env.ADMIN_EMAILS = originalAdminEmails; });

describe('admin authorization and query safety', () => {
  it('allows only normalized server-configured admin emails', () => {
    process.env.ADMIN_EMAILS = 'owner@example.com, ops@example.com';
    expect(isAdminEmail(' OWNER@example.com ')).toBe(true);
    expect(isAdminEmail('customer@example.com')).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it('normalizes pagination and escapes search expressions', () => {
    expect(safePage('-4')).toBe(1);
    expect(safePage('3')).toBe(3);
    expect(escapeRegExp('kit.*(test)')).toBe('kit\\.\\*\\(test\\)');
  });
});

describe('admin mutation validation', () => {
  it('rejects invalid products and accepts a valid draft payload', () => {
    expect(productFormSchema.safeParse({ title: 'x' }).success).toBe(false);
    expect(productFormSchema.safeParse({ title: 'Starter Kit', summary: 'A useful starter summary', description: 'A sufficiently detailed product description for validation.', category: 'Engineering', productType: 'digital-product', format: 'PDF', priceInr: '1000', imageUrl: 'https://example.com/cover.jpg', badge: 'New', demoIncluded: false, featured: false, isPublished: false }).success).toBe(true);
  });

  it('rejects duplicate-shaped invalid category input and unsafe learning status', () => {
    expect(categoryFormSchema.safeParse({ name: 'A', slug: 'a', description: 'short' }).success).toBe(false);
    expect(learningLessonSchema.safeParse({ title: 'Lesson', pathTitle: 'Path', subject: 'TypeScript', status: 'executing' }).success).toBe(false);
  });
});

describe('dashboard aggregation', () => {
  it('counts only paid INR orders in monetary analytics', () => {
    expect(paidRevenuePipeline()[0]).toEqual({ $match: { paymentStatus: 'paid', currency: 'INR' } });
    expect(topProductsPipeline()[0]).toEqual({ $match: { paymentStatus: 'paid', currency: 'INR' } });
    expect(JSON.stringify(paidRevenuePipeline())).not.toContain('pending');
  });
  it('fills sparse paid transaction dates without fabricating value', () => {
    expect(fillSalesTrend([{ _id: '2026-10-01', total: 100, orders: 1 }, { _id: '2026-10-03', total: 250, orders: 2 }])).toEqual([
      { date: '2026-10-01', total: 100, orders: 1 }, { date: '2026-10-02', total: 0, orders: 0 }, { date: '2026-10-03', total: 250, orders: 2 },
    ]);
  });
});
