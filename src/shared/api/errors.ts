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

/**
 * Every string inside a value, whatever shape it arrived in.
 *
 * `errors` is not consistently `{ field: string[] }` in practice. Observed
 * variants include a bare string, an array of strings, and a single string
 * where an array was expected. Each is a legitimate message that the user needs
 * to read, so this flattens rather than rejecting anything it does not
 * recognise.
 */
function collectStrings(value: unknown, depth = 0): string[] {
  if (depth > 3) return [];

  if (typeof value === "string") {
    const text = value.trim();
    return text ? [text] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectStrings(entry, depth + 1));
  }

  if (isRecord(value)) {
    return Object.values(value).flatMap((entry) =>
      collectStrings(entry, depth + 1),
    );
  }

  return [];
}

/**
 * Pulls `{ errors: { field: [...] } }` out of a 422 body.
 *
 * **Keyed messages only** — these are destined for form fields, so a message
 * with no field name has nowhere to go and is deliberately left out.
 * `extractErrorMessages` is the counterpart that keeps everything.
 */
export function extractFieldErrors(payload: unknown): FieldErrors | undefined {
  if (!isRecord(payload) || !isRecord(payload.errors)) return undefined;

  const result: FieldErrors = {};
  for (const [field, value] of Object.entries(payload.errors)) {
    const messages = collectStrings(value);
    if (messages.length) result[field] = messages;
  }

  return Object.keys(result).length ? result : undefined;
}

/**
 * Every message in an error body, keyed or not.
 *
 * Exists because `errors` is the only place the *specific* problem is stated.
 * The envelope's own `message` is frequently a category label — "Data
 * Validation Error" — which tells the user nothing about what to change. So the
 * toast is built from these, and falls back to the envelope only when there are
 * none.
 *
 * Handles the unkeyed shapes too (`errors: "…"`, `errors: ["…"]`), which have
 * no field to attach to and would otherwise be dropped silently.
 */
export function extractErrorMessages(payload: unknown): string[] {
  if (!isRecord(payload)) return [];

  const messages = collectStrings(payload.errors);

  // De-duplicated: the same message repeated under two keys is one thing to
  // fix, and reading it twice in a toast just looks broken.
  return [...new Set(messages)];
}

/** How much of a multi-message body a toast will carry before it truncates. */
const MAX_TOAST_MESSAGES = 3;
const MAX_TOAST_LENGTH = 300;

/**
 * Joins messages for display, capped so a toast cannot grow unbounded.
 *
 * **One message per line.** A failure naming several fields — a forwarder code
 * *and* a backward code — reads as two separate problems, and space-joining
 * them produces a run-on sentence that looks like one garbled complaint. The
 * toast renders `whitespace-pre-line` so these survive as lines.
 *
 * A single message contains no newline and is therefore unchanged.
 */
export function summarizeMessages(messages: string[]): string | undefined {
  if (!messages.length) return undefined;

  const shown = messages.slice(0, MAX_TOAST_MESSAGES);
  const suffix =
    messages.length > shown.length
      ? `\n(+${messages.length - shown.length} more)`
      : "";

  const text = `${shown.join("\n")}${suffix}`;
  return text.length > MAX_TOAST_LENGTH
    ? `${text.slice(0, MAX_TOAST_LENGTH - 1).trimEnd()}…`
    : text;
}

/**
 * The message to show the user, and the upstream one kept for logs.
 *
 * Three sources, in order of how much they actually tell the user:
 *
 * 1. **The `errors` body.** The only place the specific problem is named —
 *    "The forwarder code field must be a string." A body can say
 *    `message: "Data Validation Error"` and still carry that; showing the label
 *    instead was the bug this ordering fixes.
 * 2. **The envelope `message`.** Useful on a 4xx that names no fields at all
 *    ("Invalid credentials").
 * 3. **Our own copy for the status**, when the body offers nothing.
 *
 * 5xx bodies carry stack traces and SQL, so nothing from them is ever shown —
 * the status copy is used regardless of what they contain. 401 can still use
 * the upstream message on public calls such as `/login`; protected-session
 * redirects remain handled by the private client interceptor.
 */
export function preferredMessage(
  status: number,
  payload: unknown,
): { display: string; upstream?: string } {
  const upstream =
    isRecord(payload) && typeof payload.message === "string"
      ? payload.message.trim()
      : undefined;

  const trusted = status < 500;

  if (trusted) {
    const specific = summarizeMessages(extractErrorMessages(payload));
    if (specific) return { display: specific, upstream };
  }

  const usable =
    trusted && upstream && upstream.length > 0 && upstream.length <= 200;

  return {
    display: usable ? upstream : messageForStatus(status),
    upstream,
  };
}
