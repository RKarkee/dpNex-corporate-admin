/** The single error type the data layer throws; `status` is the discriminant. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** User-facing copy. Backend messages are never shown verbatim. */
export function messageForStatus(status: number): string {
  switch (status) {
    case 400:
      return "That request could not be processed. Please check your input.";
    case 401:
      return "Your session has ended. Please sign in again.";
    case 403:
      return "You do not have permission to do that.";
    case 404:
      return "We could not find what you were looking for.";
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
