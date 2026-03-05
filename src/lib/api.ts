import { ApiError } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

class ApiRequestError extends Error {
  status: number;
  field?: string;
  code?: string;

  constructor(message: string, status: number, field?: string, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.field = field;
    this.code = code;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const isInternalApiRoute = path.startsWith("/api/");
  // Keep internal Next.js route handlers on same-origin even when an external API base is configured.
  const primaryUrl = isInternalApiRoute ? path : `${BASE_URL}${path}`;

  const requestInit: RequestInit = {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  let res: Response;
  try {
    res = await fetch(primaryUrl, requestInit);
  } catch (error) {
    // If an external base URL is unreachable, fall back to same-origin path.
    if (!isInternalApiRoute && BASE_URL && path.startsWith("/")) {
      try {
        res = await fetch(path, requestInit);
      } catch (fallbackError) {
        const message =
          fallbackError instanceof Error ? fallbackError.message : "Network request failed";
        throw new ApiRequestError(message, 0);
      }
    } else {
      const message = error instanceof Error ? error.message : "Network request failed";
      throw new ApiRequestError(message, 0);
    }
  }

  if (!res.ok) {
    let errorBody: ApiError = { message: `Request failed: ${res.status}` };
    try {
      const parsed = (await res.json()) as ApiError & { error?: string };
      errorBody = {
        ...parsed,
        message:
          parsed.message ??
          parsed.error ??
          `Request failed: ${res.status}`,
      };
    } catch {
      // ignore JSON parse failure
    }
    throw new ApiRequestError(
      errorBody.message,
      res.status,
      errorBody.field,
      errorBody.code
    );
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

// ─── HTTP Verbs ───────────────────────────────────────────────────────────────

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>(path, { method: "GET" });
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  put<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: "DELETE" });
  },
};

export { ApiRequestError };
export default api;
