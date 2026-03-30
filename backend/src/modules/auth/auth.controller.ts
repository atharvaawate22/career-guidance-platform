import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import * as authService from './auth.service';
import { LoginRequest } from './auth.types';
import { loginSchema } from './auth.schemas';
import {
  ADMIN_AUTH_COOKIE,
  ADMIN_CSRF_COOKIE,
  getSessionCookieMaxAgeMs,
} from './auth.constants';

export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body) as LoginRequest;

    const result = await authService.login(email, password);

    if (!result) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
      return;
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const maxAge = getSessionCookieMaxAgeMs(process.env.JWT_EXPIRES_IN);
    const csrfToken = crypto.randomBytes(24).toString('hex');
    res.cookie(ADMIN_AUTH_COOKIE, result.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
    res.cookie(ADMIN_CSRF_COOKIE, csrfToken, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const sessionController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  res.status(200).json({
    success: true,
    data: {
      authenticated: true,
      user: req.user,
    },
  });
};

export const csrfController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const existing = req.cookies?.[ADMIN_CSRF_COOKIE] as string | undefined;
  const csrfToken = existing || crypto.randomBytes(24).toString('hex');

  if (!existing) {
    const isProduction = process.env.NODE_ENV === 'production';
    const maxAge = getSessionCookieMaxAgeMs(process.env.JWT_EXPIRES_IN);
    res.cookie(ADMIN_CSRF_COOKIE, csrfToken, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
  }

  res.status(200).json({
    success: true,
    data: { csrfToken },
  });
};

export const logoutController = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie(ADMIN_AUTH_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
  res.clearCookie(ADMIN_CSRF_COOKIE, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};
