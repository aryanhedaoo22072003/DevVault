import { describe, expect, it } from 'vitest';
import {
  UserService, firstById, isCreateUserInput, parseLegacyUser, parsePort,
  paymentLabel, requireRole, settle, toPublicUser, uniqueById,
  type UserRecord,
} from './typescript-systems-blueprint-examples';

const user: UserRecord = { id: 'u1', email: 'learner@example.test', role: 'member' };

describe('TypeScript Systems Blueprint executable examples', () => {
  it('validates configuration without trusting strings', () => {
    expect(parsePort('3000')).toEqual({ ok: true, value: 3000 });
    expect(parsePort('0')).toEqual({ ok: false, error: 'invalid' });
    expect(parsePort(undefined)).toEqual({ ok: false, error: 'missing' });
  });
  it('narrows discriminated unions exhaustively', () => {
    expect(paymentLabel({ kind: 'paid', paymentId: 'test-payment' })).toBe('Paid: test-payment');
  });
  it('constrains generic lookup inputs', () => {
    expect(firstById([user], 'u1')).toEqual(user);
  });
  it('creates explicit public projections', () => {
    expect(toPublicUser(user)).toEqual({ id: 'u1', role: 'member' });
  });
  it('keeps repository implementations behind a service boundary', async () => {
    const service = new UserService({ findById: async (id) => id === 'u1' ? user : null });
    await expect(service.getPublicUser('u1')).resolves.toEqual({ ok: true, value: { id: 'u1', role: 'member' } });
    await expect(service.getPublicUser('missing')).resolves.toEqual({ ok: false, error: 'not_found' });
  });
  it('validates unknown API input at runtime', () => {
    expect(isCreateUserInput({ email: 'valid@example.test' })).toBe(true);
    expect(isCreateUserInput({ email: 42 })).toBe(false);
  });
  it('deduplicates by stable identity', () => {
    expect(uniqueById([{ id: 'a', n: 1 }, { id: 'a', n: 2 }])).toEqual([{ id: 'a', n: 2 }]);
  });
  it('models asynchronous failures as data', async () => {
    await expect(settle(async () => 7)).resolves.toEqual({ ok: true, value: 7 });
    const result = await settle(async () => { throw new Error('network'); });
    expect(result.ok).toBe(false);
  });
  it('checks authorization independently from authentication', () => {
    expect(requireRole(user, 'admin')).toEqual({ ok: false, error: 'forbidden' });
  });
  it('validates JavaScript values before admitting them to typed code', () => {
    expect(parseLegacyUser({ id: 'u1', email: 'a@example.test', role: 'member' })).toEqual({ ok: true, value: { id: 'u1', email: 'a@example.test', role: 'member' } });
    expect(parseLegacyUser({ id: 1, email: 'a@example.test', role: 'member' })).toEqual({ ok: false, error: 'invalid_user' });
  });
});
