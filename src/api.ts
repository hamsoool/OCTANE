const API_BASE = import.meta.env.VITE_API_URL || "/api";

let currentToken: string | null = null;
let currentUser: { username: string; role: string } | null = null;

function fetchOpts(extra?: Record<string, unknown>): RequestInit {
  return {
    credentials: "include",
    ...extra,
  };
}

export async function apiPost<T>(endpoint: string, body: Record<string, unknown>): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOpts(),
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

export async function apiGet<T>(endpoint: string): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, fetchOpts());
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.message || "Request failed." };
    }
    return { success: true, data };
  } catch {
    return { success: false, error: "Unable to reach the system. Check your connection." };
  }
}

export function setToken(token: string, username: string, role: string): void {
  currentToken = token;
  currentUser = { username, role };
}

export function clearToken(): void {
  currentToken = null;
  currentUser = null;
}

export function getToken(): string | null {
  return currentToken;
}

export function isAuthenticated(): boolean {
  return currentToken !== null;
}

export function getUsername(): string | null {
  return currentUser?.username ?? null;
}

export function getRole(): string | null {
  return currentUser?.role ?? null;
}

export async function checkSession(): Promise<boolean> {
  const res = await apiGet<{ userId: string; username: string; role: string }>("/auth/me");
  if (res.success && res.data) {
    currentUser = { username: res.data.username, role: res.data.role };
    currentToken = "session";
    return true;
  }
  clearToken();
  return false;
}
