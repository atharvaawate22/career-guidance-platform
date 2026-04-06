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

const mockUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  password_hash: 'stored-hash',
  role: 'admin',
  created_at: new Date().toISOString(),
};

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
    vi.mocked(findUserByEmail).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    delete process.env.JWT_SECRET;

    await expect(login('admin@example.com', 'secret')).rejects.toMatchObject({
      code: 'AUTH_CONFIGURATION_ERROR',
      statusCode: 500,
      publicMessage: 'Admin login is temporarily unavailable.',
    });
  });

  it('returns null when user is not found', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(null);

    const result = await login('nonexistent@example.com', 'any');
    expect(result).toBeNull();
  });

  it('returns null when password does not match', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const result = await login('admin@example.com', 'wrongpassword');
    expect(result).toBeNull();
  });

  it('returns token with correct payload shape on valid credentials', async () => {
    process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
    vi.mocked(findUserByEmail).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await login('admin@example.com', 'correctpassword');

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      token: expect.any(String),
      user: {
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      },
    });
    expect(result!.token.split('.').length).toBe(3); // valid JWT format
  });
});
