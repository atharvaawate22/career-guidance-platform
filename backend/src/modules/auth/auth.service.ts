import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { findUserByEmail } from './auth.repository';
import { LoginResponse, JWTPayload } from './auth.types';

export const login = async (
  email: string,
  password: string,
): Promise<LoginResponse | null> => {
  // Fetch user from database
  const user = await findUserByEmail(email);

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
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  const payload: JWTPayload = {
    userId: user.id,
    role: user.role,
  };

  const token = jwt.sign(payload, jwtSecret, { expiresIn: '24h' });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  };
};
