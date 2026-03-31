import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcrypt';
import { login } from '../src/modules/auth/auth.service';
import { findUserByEmail } from '../src/modules/auth/auth.repository';

vi.mock('../src/modules/auth/auth.repository', () => ({
  findUserByEmail: vi.fn(),
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
  },
}));

describe('auth.service login error handling', () => {
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = originalJwtSecret;
  });

  it('wraps database failures with a login-specific error code', async () => {
    vi.mocked(findUserByEmail).mockRejectedValue(new Error('connect ECONNREFUSED'));

    await expect(login('admin@example.com', 'secret')).rejects.toMatchObject({
      code: 'AUTH_DATABASE_ERROR',
      statusCode: 500,
      publicMessage: 'Unable to verify admin login right now.',
    });
  });

  it('returns a configuration-specific error code when JWT_SECRET is missing', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      password_hash: 'stored-hash',
      role: 'admin',
      created_at: new Date().toISOString(),
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    delete process.env.JWT_SECRET;

    await expect(login('admin@example.com', 'secret')).rejects.toMatchObject({
      code: 'AUTH_CONFIGURATION_ERROR',
      statusCode: 500,
      publicMessage: 'Admin login is temporarily unavailable.',
    });
  });
});
