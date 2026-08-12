import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodTypeDef, ZodError } from 'zod';

/**
 * Generic over input AND output, not just output. The query schemas coerce and
 * normalize (string -> number, "Male" -> "male", string -> string[]), so their
 * input type differs from their output type; the narrower `ZodSchema<T>` alias
 * assumes the two are identical and rejects any schema carrying a transform.
 */
type AnySchema<TOut, TIn> = ZodType<TOut, ZodTypeDef, TIn>;

/**
 * Single 400 envelope shared by validateBody and validateQuery so a rejected
 * body and a rejected query string are indistinguishable to a client.
 */
function sendValidationError(
  res: Response,
  error: ZodError,
  fallbackMessage: string,
): void {
  const firstIssue = error.issues[0];
  res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: firstIssue?.message || fallbackMessage,
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    },
  });
}

export function validateBody<TOut, TIn>(schema: AnySchema<TOut, TIn>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        sendValidationError(res, error, 'Invalid request payload');
        return;
      }

      next(error);
    }
  };
}

/**
 * Query-string counterpart of validateBody.
 *
 * The parsed result is written to `req.validatedQuery`, NOT back onto
 * `req.query`. In Express 5 `req.query` is a getter with no setter, so
 * `req.query = parsed` throws at runtime:
 *
 *   TypeError: Cannot set property query of #<IncomingMessage>
 *              which has only a getter
 *
 * and @types/express-serve-static-core still declares `query` as a writable
 * property, so `tsc` does NOT catch that. Verified against the installed
 * express@5.2.1 — do not "simplify" this back to an assignment.
 *
 * Parsing once here also removes repeated work: the Express 5 getter is not
 * memoised, so it re-runs the query parser and returns a fresh object on every
 * access (`req.query !== req.query`). CutoffsController.getCutoffs read it 11
 * times per request before this middleware existed.
 */
export function validateQuery<TOut, TIn>(schema: AnySchema<TOut, TIn>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.validatedQuery = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        sendValidationError(res, error, 'Invalid query parameters');
        return;
      }

      next(error);
    }
  };
}
