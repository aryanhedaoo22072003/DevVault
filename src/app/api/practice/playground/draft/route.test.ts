import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.fn(); const findOne = vi.fn(); const updateOne = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({ auth }));
vi.mock('@/lib/db', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/playground-draft.model', () => ({ PlaygroundDraftModel: { findOne, updateOne } }));

describe('playground draft ownership', () => {
  beforeEach(() => { auth.mockReset(); findOne.mockReset(); updateOne.mockReset(); });
  it('rejects anonymous reads and writes', async () => {
    auth.mockResolvedValue({ userId: null }); const { GET, PATCH } = await import('./route');
    expect((await GET(new Request('http://localhost/api/practice/playground/draft?workspace=retail-analytics&language=sql'))).status).toBe(401);
    expect((await PATCH(new Request('http://localhost/api/practice/playground/draft', { method:'PATCH', body:'{}' }))).status).toBe(401);
    expect(findOne).not.toHaveBeenCalled(); expect(updateOne).not.toHaveBeenCalled();
  });
  it('derives the owner from Clerk and ignores browser identity fields', async () => {
    auth.mockResolvedValue({ userId: 'user_real' }); updateOne.mockResolvedValue({ acknowledged:true }); const { PATCH } = await import('./route');
    const response = await PATCH(new Request('http://localhost/api/practice/playground/draft', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({workspace:'retail-analytics',language:'sql',code:'SELECT 1',clerkUserId:'user_forged'}) }));
    expect(response.status).toBe(200); expect(updateOne).toHaveBeenCalledWith({clerkUserId:'user_real',workspace:'retail-analytics',language:'sql'},expect.anything(),expect.anything());
  });
  it('rejects oversized source before a database write', async () => {
    auth.mockResolvedValue({ userId:'user_real' }); const { PATCH } = await import('./route');
    const response=await PATCH(new Request('http://localhost/api/practice/playground/draft',{method:'PATCH',body:JSON.stringify({workspace:'retail-analytics',language:'sql',code:'x'.repeat(30_001)})}));
    expect(response.status).toBe(400); expect(updateOne).not.toHaveBeenCalled();
  });
});
