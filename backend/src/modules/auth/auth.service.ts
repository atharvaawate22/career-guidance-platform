import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { findUserByEmail } from './auth.repository';
import { LoginResponse, JWTPayload } from './auth.types';

type AuthServiceError = Error & {
  code?: string;
  statusCode?: number;
  publicMessage?: string;
  cause?: unknown;
};

const createAuthServiceError = (
  message: string,
  code: string,
  publicMessage: string,
): AuthServiceError => {
  const error = new Error(message) as AuthServiceError;
  error.code = code;
  error.statusCode = 500;
  error.publicMessage = publicMessage;
  return error;
};

export const login = async (
  email: string,
  password: string,
): Promise<LoginResponse | null> => {
  let user;
  try {
    user = await findUserByEmail(email);
  } catch (error) {
    const authError = createAuthServiceError(
      'Admin login failed while querying the database',
      'AUTH_DATABASE_ERROR',
      'Unable to verify admin login right now.',
    );
    authError.cause = error;
    throw authError;
  }

  if (!user) {
    return null;
  }

  // Compare password with hash
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    return null;
  }

  // Generate JWT
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw createAuthServiceError(
      'JWT_SECRET is not defined in environment variables',
      'AUTH_CONFIGURATION_ERROR',
      'Admin login is temporarily unavailable.',
    );
  }

  const payload: JWTPayload = {
    userId: user.id,
    role: user.role,
  };

  const expiresIn = (process.env.JWT_EXPIRES_IN || '24h') as jwt.SignOptions['expiresIn'];
  const token = jwt.sign(payload, jwtSecret, { expiresIn });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  };
};
