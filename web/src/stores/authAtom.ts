import { atom } from "jotai";

export interface AuthState {
  token: string | null;
}

const STORAGE_KEY = "auth_token";

// The development token is read only in development mode. In a production build `import.meta.env.DEV` is the constant
// false, so the bundler drops the variable and its value from the public files (spec 011).
export function getStoredToken(): string | null {
  const devToken = import.meta.env.DEV ? import.meta.env.VITE_DEV_TOKEN : undefined;
  return localStorage.getItem(STORAGE_KEY) ?? devToken ?? null;
}

export function saveToken(token: string) {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(STORAGE_KEY);
}

export const authAtom = atom<AuthState>({
  token: getStoredToken(),
});
