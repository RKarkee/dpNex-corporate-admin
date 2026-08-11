/** The single error type the data layer throws; `status` is the discriminant. */

/** Laravel's 422 shape: `{ field: ["message", …] }`. */
export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  /** 0 means the request never reached the server. */
  readonly status: number;
  /** The parsed response body, when there was one. */
  readonly payload?: unknown;
  /** Per-field messages from a 422, ready to feed into a form. */
  readonly fieldErrors?: FieldErrors;
  /** The upstream's own `message`, kept for logs — not for display. */
  readonly upstreamMessage?: string;

  constructor(
    status: number,
    message: string,
    options: {
      payload?: unknown;
      fieldErrors?: FieldErrors;
      upstreamMessage?: string;
      cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.status = status;
    this.payload = options.payload;
    this.fieldErrors = options.fieldErrors;
    this.upstreamMessage = options.upstreamMessage;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isValidationError(): boolean {
    return this.status === 422;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  /** The first message for a field, if the server flagged it. */
  fieldError(name: string): string | undefined {
    return this.fieldErrors?.[name]?.[0];
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** User-facing copy. Backend messages are never shown verbatim. */
export function messageForStatus(status: number): string {
  switch (status) {
    case 0:
      return "Could not reach the service. Check your connection and try again.";
    case 400:
      return "That request could not be processed. Please check your input.";
    case 401:
      return "Your session has ended. Please sign in again.";
    case 403:
      return "You do not have permission to do that.";
    case 404:
      return "We could not find what you were looking for.";
    case 408:
      return "The request took too long. Please try again.";
    case 409:
      return "That conflicts with something that already exists.";
    case 413:
      return "That file is too large to upload.";
    case 422:
      return "Please correct the highlighted fields and try again.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 503:
      return "The service is temporarily unavailable. Please try again.";
    default:
      return status >= 500
        ? "Something went wrong on our side. Please try again."
        : "Something went wrong. Please try again.";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Pulls `{ errors: { field: [...] } }` out of a 422 body. */
export function extractFieldErrors(payload: unknown): FieldErrors | undefined {
  if (!isRecord(payload) || !isRecord(payload.errors)) return undefined;

  const result: FieldErrors = {};
  for (const [field, value] of Object.entries(payload.errors)) {
    if (Array.isArray(value)) {
      const messages = value.filter((v): v is string => typeof v === "string");
      if (messages.length) result[field] = messages;
    } else if (typeof value === "string") {
      result[field] = [value];
    }
  }

  return Object.keys(result).length ? result : undefined;
}

/**
 * The upstream's `message`, when it is worth showing.
 *
 * 4xx bodies carry copy meant for the user ("Invalid credentials"); 5xx bodies
 * carry stack traces and SQL. So: trust the message below 500, never above it.
 */
export function preferredMessage(
  status: number,
  payload: unknown,
): { display: string; upstream?: string } {
  const upstream =
    isRecord(payload) && typeof payload.message === "string"
      ? payload.message.trim()
      : undefined;

  const usable =
    upstream &&
    upstream.length > 0 &&
    upstream.length <= 200 &&
    status < 500 &&
    status !== 401;

  return {
    display: usable ? upstream : messageForStatus(status),
    upstream,
  };
}
