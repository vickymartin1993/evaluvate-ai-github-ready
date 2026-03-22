/**
 * Evaluvate AI — API Client
 *
 * All HTTP calls to the Azure Functions backend go through this file.
 * It handles:
 *   - Base URL from environment variables
 *   - Auth header injection (TODO Sprint 4: attach JWT from auth provider)
 *   - Consistent error handling and response parsing
 *   - Feature flag detection (falls back to mock data when flag is false)
 *
 * Usage:
 *   import { api } from '@/services/api';
 *   const exams = await api.get<Exam[]>('/exams');
 *   await api.post('/upload/sas', { examId, registrationId });
 */

// Feature flags — all driven by VITE_ environment variables set at build time.
// During local dev, keep these false so the UI uses mock data.
// Set to true in .env.local one by one as each backend feature is ready.
export const features = {
  realUpload: import.meta.env.VITE_FEATURE_REAL_UPLOAD === "true",
  realScoring: import.meta.env.VITE_FEATURE_REAL_SCORING === "true",
  realAuth: import.meta.env.VITE_FEATURE_REAL_AUTH === "true",
} as const;

// POC school ID — used until real auth is wired in Sprint 4
export const POC_SCHOOL_ID =
  import.meta.env.VITE_POC_SCHOOL_ID || "school_poc_001";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:7071/api";

// ─── API client ───────────────────────────────────────────────────────────────

async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // TODO Sprint 4: add auth token here
  // const token = await getAuthToken(); // from Clerk or Azure AD B2C
  // if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Parse JSON error body for consistent error messages
  if (!response.ok) {
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      if (errorBody.error) errorMessage = errorBody.error;
    } catch {
      // Ignore JSON parse failure in error path
    }
    throw new Error(errorMessage);
  }

  // Handle 204 No Content responses
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
