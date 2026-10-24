import { afterEach, describe, expect, it } from 'vitest';

import { accountCapabilities, isOwnerClerkUserId, isValidOwnerClerkUserId } from '@/lib/auth';
import { escapeRegExp, fillSalesTrend, paidRevenuePipeline, safePage, topProductsPipeline } from '@/lib/admin';
import { categoryFormSchema, learningLessonSchema, productFormSchema } from '@/lib/validators';

const originalOwnerId = process.env.DEVVAULT_OWNER_CLERK_USER_ID;
afterEach(() => { if (originalOwnerId === undefined) delete process.env.DEVVAULT_OWNER_CLERK_USER_ID; else process.env.DEVVAULT_OWNER_CLERK_USER_ID = originalOwnerId; });

describe('admin authorization and query safety', () => {
  it('allows only the exact server-configured owner Clerk identity', () => {
    process.env.DEVVAULT_OWNER_CLERK_USER_ID = 'user_owner123456';
    expect(isOwnerClerkUserId('user_owner123456')).toBe(true);
    expect(isOwnerClerkUserId('user_student12345')).toBe(false);
    expect(isOwnerClerkUserId(undefined)).toBe(false);
  });

  it('fails closed for missing or malformed owner configuration', () => {
    delete process.env.DEVVAULT_OWNER_CLERK_USER_ID;
    expect(isOwnerClerkUserId('user_owner123456')).toBe(false);
    process.env.DEVVAULT_OWNER_CLERK_USER_ID = 'owner@example.com';
    expect(isValidOwnerClerkUserId(process.env.DEVVAULT_OWNER_CLERK_USER_ID)).toBe(false);
    expect(isOwnerClerkUserId('owner@example.com')).toBe(false);
  });

  it('ignores forged role-like browser data because identity is the only input', () => {
    process.env.DEVVAULT_OWNER_CLERK_USER_ID = 'user_owner123456';
    const forgedPayload = { userId: 'user_student12345', role: 'admin', publicMetadata: { role: 'admin' } };
    expect(isOwnerClerkUserId(forgedPayload.userId)).toBe(false);
  });

  it('does not remove student identity from the owner account', () => {
    process.env.DEVVAULT_OWNER_CLERK_USER_ID = 'user_owner123456';
    expect(accountCapabilities('user_owner123456')).toEqual({ student: true, admin: true });
  });

  it('keeps every other authenticated account student-only', () => {
    process.env.DEVVAULT_OWNER_CLERK_USER_ID = 'user_owner123456';
    expect(accountCapabilities('user_student12345')).toEqual({ student: true, admin: false });
  });

  it('gives anonymous requests neither student nor admin capabilities', () => {
    process.env.DEVVAULT_OWNER_CLERK_USER_ID = 'user_owner123456';
    expect(accountCapabilities(null)).toEqual({ student: false, admin: false });
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
