import type { AuthUser } from "@/types/armor";

// The backend's /api/auth/login and /api/auth/signup do not return a token —
// they just verify credentials and return the user's profile row (see
// backend/db.py verify_user_auth / create_user_auth). There is no session or
// JWT to manage, so we simply persist the returned user object locally and
// re-send its `username` on every subsequent API call that needs one.
const STORAGE_KEY = "armor.session.user";

export function loadSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function saveSession(user: AuthUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
