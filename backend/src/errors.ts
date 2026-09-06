/**
 * A failure the caller caused, carrying the status and code to report.
 *
 * Anything else that escapes a handler is a bug or an outage and becomes a 500
 * with a generic message — driver text, SQL and stack traces never reach a
 * response body.
 */
export class ApiError extends Error {
  constructor(
    readonly status: 400 | 403 | 404 | 409,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const notFound = (what: string) =>
  new ApiError(404, "not_found", `${what} not found`);

export const conflict = (message: string) =>
  new ApiError(409, "conflict", message);

export const forbidden = (message: string) =>
  new ApiError(403, "forbidden", message);

/** The single error body shape every failing response uses. */
export type ErrorBody = { error: { message: string; code: string } };
