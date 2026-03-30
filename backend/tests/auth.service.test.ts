import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findUserByEmailMock, bcryptCompareMock, jwtSignMock } = vi.hoisted(
  () => ({
    findUserByEmailMock: vi.fn(),
    bcryptCompareMock: vi.fn(),
    jwtSignMock: vi.fn(),
  }),
);

vi.mock('../src/modules/auth/auth.repository', () => ({
  findUserByEmail: findUserByEmailMock,
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: bcryptCompareMock,
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: jwtSignMock,
  },
}));

import { login } from '../src/modules/auth/auth.service';

describe('auth.service login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test_secret_123';
    process.env.JWT_EXPIRES_IN = '24h';
  });

  it('returns null when user does not exist', async () => {
    findUserByEmailMock.mockResolvedValueOnce(null);

    const result = await login('missing@example.com', 'password');

    expect(result).toBeNull();
  });

  it('returns null for invalid password', async () => {
    findUserByEmailMock.mockResolvedValueOnce({
      id: 'user-1',
      email: 'admin@example.com',
      password_hash: 'hashed',
      role: 'admin',
    });
    bcryptCompareMock.mockResolvedValueOnce(false);

    const result = await login('admin@example.com', 'wrong-password');

    expect(result).toBeNull();
  });

  it('returns token and user for valid credentials', async () => {
    findUserByEmailMock.mockResolvedValueOnce({
      id: 'user-1',
      email: 'admin@example.com',
      password_hash: 'hashed',
      role: 'admin',
    });
    bcryptCompareMock.mockResolvedValueOnce(true);
    jwtSignMock.mockReturnValueOnce('signed-token');

    const result = await login('admin@example.com', 'correct-password');

    expect(jwtSignMock).toHaveBeenCalled();
    expect(result).toEqual({
      token: 'signed-token',
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        role: 'admin',
      },
    });
  });
});
