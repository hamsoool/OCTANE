const API_BASE = import.meta.env.VITE_API_URL || "/api";

const STORAGE_KEY = "octane_cookie_consent";

let currentToken: string | null = null;
let currentUser: { username: string; role: string } | null = null;

function fetchOpts(extra?: RequestInit): RequestInit {
  return {
    credentials: "include",
    ...extra,
  };
}

export async function apiPost<T>(endpoint: string, body: object): Promise<{ success: boolean; data?: T; error?: string }> {
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

export async function apiPatch<T>(endpoint: string, body: object): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOpts(),
      method: "PATCH",
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

export async function apiDelete<T>(endpoint: string): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOpts(),
      method: "DELETE",
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
  const res = await apiGet<MeResponse>("/auth/me");
  if (res.success && res.data) {
    currentUser = { username: res.data.username, role: res.data.role };
    currentToken = "session";
    if (res.data.cookiePreferences) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data.cookiePreferences));
    }
    return true;
  }
  clearToken();
  return false;
}

export interface MeResponse {
  userId: string;
  username: string;
  role: string;
  email?: string;
  cookiePreferences?: CookiePreferences | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  birthday?: string | null;
  phone?: string | null;
  address?: string | null;
  addressCoords?: [number, number] | null;
  addressLabel?: string | null;
}

export interface UserProfile {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  fullName: string | null;
  birthday: string | null;
  phone: string | null;
  address: string | null;
  addressCoords: [number, number] | null;
  addressLabel: string | null;
}

export async function getMe(): Promise<MeResponse | null> {
  const res = await apiGet<MeResponse>("/auth/me");
  return res.success && res.data ? res.data : null;
}

/** Birthday is stored as a Date server-side; accept the YYYY-MM-DD input value. */
function toBirthdayInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // Use local parts so the date shown matches what the user picked, not UTC.
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export async function getProfile(): Promise<UserProfile | null> {
  const me = await getMe();
  if (!me) return null;
  return {
    firstName: me.firstName ?? null,
    middleName: me.middleName ?? null,
    lastName: me.lastName ?? null,
    fullName: me.fullName ?? null,
    birthday: toBirthdayInput(me.birthday),
    phone: me.phone ?? null,
    address: me.address ?? null,
    addressCoords: me.addressCoords ?? null,
    addressLabel: me.addressLabel ?? null,
  };
}

/** Email is intentionally absent: the server has no email-change path. */
export async function saveProfile(input: {
  firstName: string;
  middleName: string;
  lastName: string;
  birthday: string;
  phone: string;
  address: string;
}): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
  const res = await apiPatch<UserProfile>("/auth/profile", input);
  return { success: res.success, data: res.data, error: res.error };
}

/** Step 1: verify the current password, which emails a 6-digit confirmation code. */
export async function requestPasswordChange(
  currentPassword: string
): Promise<{ success: boolean; error?: string }> {
  const res = await apiPost<{ message: string }>("/auth/profile/change-password", { currentPassword });
  return { success: res.success, error: res.error };
}

/** Step 2: submit the emailed code plus the new password. */
export async function confirmPasswordChange(input: {
  code: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  const res = await apiPost<{ message: string }>("/auth/profile/confirm-password", input);
  return { success: res.success, error: res.error };
}

/** Resolves an address to coordinates; the server stores them on the user. */
export async function geocodeAddress(
  address: string
): Promise<{ success: boolean; data?: { coords: [number, number]; label: string }; error?: string }> {
  return apiPost<{ coords: [number, number]; label: string }>("/auth/profile/geocode", { address });
}

// Concrete shape, not Record<string, boolean>: an interface has no implicit
// index signature, so an interface value is not assignable to that type.
export interface CookiePreferences {
  functional: boolean;
  statistics: boolean;
  marketing: boolean;
}

export async function syncCookiePreferences(prefs: CookiePreferences): Promise<void> {
  await apiPatch("/auth/cookie-preferences", prefs);
}
