/**
 * Error carrying an HTTP status code and a client-safe message.
 *
 * The central errorHandler reads `statusCode`, `code`, and `publicMessage` to
 * shape the response, so throwing one of these from a service produces the
 * correct HTTP status without per-controller string-matching on messages.
 */
export interface HttpErrorOptions {
  /** Machine-readable error code surfaced to the client (e.g. 'VALIDATION_ERROR'). */
  code?: string;
  /** Client-safe message; defaults to the internal message when omitted. */
  publicMessage?: string;
  /** Underlying error retained for logging/debugging. */
  cause?: unknown;
}

export class HttpError extends Error {
  readonly statusCode: number;
  readonly code?: string;
  readonly publicMessage: string;

  constructor(
    statusCode: number,
    message: string,
    options: HttpErrorOptions = {},
  ) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = options.code;
    this.publicMessage = options.publicMessage ?? message;
    if (options.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}
