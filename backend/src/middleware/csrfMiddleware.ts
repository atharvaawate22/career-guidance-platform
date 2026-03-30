import { Request, Response, NextFunction } from 'express';
import { ADMIN_CSRF_COOKIE } from '../modules/auth/auth.constants';

export const verifyCsrfToken = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const cookieToken = req.cookies?.[ADMIN_CSRF_COOKIE] as string | undefined;
  const headerToken = req.headers['x-csrf-token'];
  const csrfToken =
    typeof headerToken === 'string'
      ? headerToken
      : Array.isArray(headerToken)
        ? headerToken[0]
        : undefined;

  if (!cookieToken || !csrfToken || cookieToken !== csrfToken) {
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'Invalid CSRF token',
      },
    });
    return;
  }

  next();
};
