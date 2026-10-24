export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export interface UserRecord { id: string; email: string; role: 'member' | 'admin' }
export type PublicUser = Pick<UserRecord, 'id' | 'role'>;

export function parsePort(value: string | undefined): Result<number, 'missing' | 'invalid'> {
  if (!value) return { ok: false, error: 'missing' };
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65_535
    ? { ok: true, value: port }
    : { ok: false, error: 'invalid' };
}

export type PaymentState =
  | { kind: 'pending'; createdAt: Date }
  | { kind: 'paid'; paymentId: string }
  | { kind: 'failed'; reason: string };

export function paymentLabel(state: PaymentState): string {
  switch (state.kind) {
    case 'pending': return 'Awaiting payment';
    case 'paid': return `Paid: ${state.paymentId}`;
    case 'failed': return `Failed: ${state.reason}`;
    default: return assertNever(state);
  }
}

export function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`);
}

export function firstById<T extends { id: string }>(items: readonly T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

export type MutablePatch<T> = { -readonly [K in keyof T]?: T[K] };

export function toPublicUser(user: UserRecord): PublicUser {
  return { id: user.id, role: user.role };
}

export interface UserRepository {
  findById(id: string): Promise<UserRecord | null>;
}

export class UserService {
  constructor(private readonly users: UserRepository) {}
  async getPublicUser(id: string): Promise<Result<PublicUser, 'not_found'>> {
    const user = await this.users.findById(id);
    return user ? { ok: true, value: toPublicUser(user) } : { ok: false, error: 'not_found' };
  }
}

export type ApiResponse<T> =
  | { status: 200; data: T }
  | { status: 400 | 401 | 403 | 404; error: { code: string; message: string } };

export function isCreateUserInput(value: unknown): value is { email: string } {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.email === 'string' && candidate.email.includes('@');
}

export function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

export async function settle<T>(operation: () => Promise<T>): Promise<Result<T, Error>> {
  try { return { ok: true, value: await operation() }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error : new Error('Unknown failure') }; }
}

export function requireRole(user: Pick<UserRecord, 'role'>, role: UserRecord['role']): Result<true, 'forbidden'> {
  return user.role === role ? { ok: true, value: true } : { ok: false, error: 'forbidden' };
}

export function parseLegacyUser(value: unknown): Result<UserRecord, 'invalid_user'> {
  if (!isCreateUserInput(value)) return { ok: false, error: 'invalid_user' };
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== 'string' || (candidate.role !== 'member' && candidate.role !== 'admin')) {
    return { ok: false, error: 'invalid_user' };
  }
  return { ok: true, value: { id: candidate.id, email: value.email, role: candidate.role } };
}
