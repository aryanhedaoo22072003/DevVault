import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({ auth }));
const originalOwnerId = process.env.DEVVAULT_OWNER_CLERK_USER_ID;

describe('GET /api/account/capabilities', () => {
  beforeEach(() => {
    auth.mockReset();
    process.env.DEVVAULT_OWNER_CLERK_USER_ID = 'user_owner123456';
  });
  afterEach(() => {
    if (originalOwnerId === undefined) delete process.env.DEVVAULT_OWNER_CLERK_USER_ID;
    else process.env.DEVVAULT_OWNER_CLERK_USER_ID = originalOwnerId;
  });

  it('returns no capabilities to anonymous requests', async () => {
    auth.mockResolvedValue({ userId: null });
    const { GET } = await import('./route');
    const response = await GET();
    await expect(response.json()).resolves.toEqual({ student: false, admin: false });
  });

  it('returns both capabilities only to the configured owner', async () => {
    const { GET } = await import('./route');
    auth.mockResolvedValue({ userId: 'user_owner123456' });
    await expect((await GET()).json()).resolves.toEqual({ student: true, admin: true });
    auth.mockResolvedValue({ userId: 'user_student12345' });
    await expect((await GET()).json()).resolves.toEqual({ student: true, admin: false });
  });

  it('fails closed when owner configuration is missing', async () => {
    delete process.env.DEVVAULT_OWNER_CLERK_USER_ID;
    auth.mockResolvedValue({ userId: 'user_owner123456' });
    const { GET } = await import('./route');
    await expect((await GET()).json()).resolves.toEqual({ student: true, admin: false });
  });
});
