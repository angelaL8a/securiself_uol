import { clearAuthSession, getAuthToken } from "@/features/auth/auth-store";
import { routes } from "@/lib/routes";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8080";

export type ApiErrorDetails = unknown;

/** Typed error thrown for any non-2xx backend response. */
export class ApiError extends Error {
  readonly status: number;
  readonly details?: ApiErrorDetails;

  constructor(status: number, message: string, details?: ApiErrorDetails) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  /** JSON-serializable request body. */
  body?: unknown;
  /** Attach the session bearer token. Defaults to true. */
  auth?: boolean;
  /** Extra query parameters. */
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  /**
   * When true, a 401 will NOT trigger the global clear + redirect. Used by the
   * OAuth consent flow which manages its own unauthenticated redirect.
   */
  skipAuthRedirect?: boolean;
}

interface BackendErrorBody {
  status?: string;
  message?: string;
  details?: unknown;
}

function buildUrl(
  path: string,
  query?: RequestOptions["query"],
): string {
  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function handleUnauthorized(skipAuthRedirect?: boolean): void {
  clearAuthSession();
  if (skipAuthRedirect) return;
  if (typeof window !== "undefined") {
    const current = `${window.location.pathname}${window.location.search}`;
    const target =
      current && current !== routes.signIn
        ? `${routes.signIn}?returnTo=${encodeURIComponent(current)}`
        : routes.signIn;
    window.location.assign(target);
  }
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, auth = true, query, signal } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  // Only a request that actually carried a session can have an expired one.
  // A 401 on an unauthenticated request (login, register, Google) is a rejected
  // credential: clearing state and reloading /sign-in there would destroy the
  // caller's error toast before the user could read it.
  if (response.status === 401 && auth) {
    handleUnauthorized(options.skipAuthRedirect);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const parsed: unknown = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    const errorBody = (parsed ?? {}) as BackendErrorBody;
    throw new ApiError(
      response.status,
      errorBody.message ?? response.statusText ?? "Request failed",
      errorBody.details,
    );
  }

  return parsed as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ) => request<T>(path, { ...options, method: "POST", body }),
  put: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ) => request<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ) => request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

/** Standard success envelope used by most backend endpoints. */
export interface DataEnvelope<T> {
  status: "success";
  data: T;
}
