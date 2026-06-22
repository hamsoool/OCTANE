const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function apiPost<T>(endpoint: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.message || "Request failed." };
    }
    return { success: true, data };
  } catch {
    return { success: false, error: "Unable to reach the system. Check your connection." };
  }
}

export function getToken(): string | null {
  return localStorage.getItem("octane_token");
}

export function setToken(token: string): void {
  localStorage.setItem("octane_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("octane_token");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function getUsername(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.username || null;
  } catch {
    return null;
  }
}
