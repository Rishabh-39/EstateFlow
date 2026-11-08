/** Live NestJS API: no browser-side mock data, inventory, payment, or AI authority. */
const BASE = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");
const TOKEN_KEY = "estateflow-access-token";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "ApiError"; }
}
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
  else window.sessionStorage.removeItem(TOKEN_KEY);
}
export async function http<T>(path: string, options: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const { auth = false, ...init } = options;
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (auth) {
    const token = getToken();
    if (!token) throw new ApiError(401, "Please sign in to continue.");
    headers.set("Authorization", `Bearer ${token}`);
  }
  let response: Response;
  try { response = await fetch(`${BASE}${path}`, { ...init, headers, cache: "no-store" }); }
  catch { throw new ApiError(0, "Cannot reach the EstateFlow backend. Check that NestJS is running and VITE_API_URL is correct."); }
  const type = response.headers.get("content-type") || "";
  const payload: unknown = type.includes("application/json") ? await response.json().catch(() => null) : await response.text();
  if (!response.ok) {
    const data = payload && typeof payload === "object" ? payload as {message?: unknown; error?: unknown} : null;
    const detail = Array.isArray(data?.message) ? data.message.join(", ") : typeof data?.message === "string" ? data.message : typeof payload === "string" && payload ? payload : `HTTP ${response.status}`;
    if (response.status === 401 && auth) setToken(null);
    throw new ApiError(response.status, detail);
  }
  return payload as T;
}
export const params = (data: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(data).forEach(([k, v]) => { if (v !== undefined) p.set(k, String(v)); });
  return `?${p.toString()}`;
};
export const json = (body: unknown, method: "POST" | "PATCH" | "PUT" = "POST"): RequestInit => ({ method, body: JSON.stringify(body) });
export const idempotency = (): string => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `ef-${Date.now()}-${Math.random().toString(36).slice(2)}`;
