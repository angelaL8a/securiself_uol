export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message = "Bad request", details?: unknown) =>
  new ApiError(400, message, details);

export const unauthorized = (message = "Unauthorized") =>
  new ApiError(401, message);

export const forbidden = (message = "Forbidden") => new ApiError(403, message);

export const notFound = (message = "Not found") => new ApiError(404, message);

export const conflict = (message = "Conflict") => new ApiError(409, message);
