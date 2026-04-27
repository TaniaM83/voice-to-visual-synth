import type { ApiError, ApiSuccess } from "../types/session";

export class ApiClientError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = (await res.json().catch(() => null)) as
    | ApiSuccess<T>
    | ApiError
    | null;

  if (!res.ok) {
    const message =
      body && "error" in body ? body.error.message : `HTTP ${res.status}`;
    throw new ApiClientError(res.status, message);
  }

  if (!body || !("data" in body)) {
    throw new ApiClientError(res.status, "Malformed API response");
  }

  return body.data;
}
