import { Request, Response, NextFunction } from 'express';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Creates a middleware that validates a named route parameter is a valid UUID.
 * Returns HTTP 400 instead of letting PostgreSQL throw "invalid input syntax for
 * type uuid" (which would bubble up as a 500).
 *
 * Usage: router.delete('/:id', validateUuidParam('id'), handler)
 */
export function validateUuidParam(paramName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName];
    if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: `Invalid ${paramName}: must be a valid UUID`,
        },
      });
      return;
    }
    next();
  };
}
