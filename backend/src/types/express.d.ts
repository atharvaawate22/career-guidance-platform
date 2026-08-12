import { JWTPayload } from '../modules/auth/auth.types';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: JWTPayload;
      /**
       * Output of `validateQuery()`. Express 5 exposes `req.query` through a
       * getter with no setter, so a parsed/normalized query object cannot be
       * written back onto it — controllers read this instead. Deliberately
       * typed `unknown`: the shape depends on which schema the route mounted,
       * so each controller casts to its own `z.infer<typeof schema>`.
       */
      validatedQuery?: unknown;
    }
  }
}

export {};
