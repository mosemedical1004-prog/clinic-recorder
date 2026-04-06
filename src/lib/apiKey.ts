export const API_KEY_LS_KEY = 'anthropicApiKey';

export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(API_KEY_LS_KEY);
}

export function hasStoredApiKey(): boolean {
  return !!getStoredApiKey();
}

export function saveApiKey(key: string): void {
  localStorage.setItem(API_KEY_LS_KEY, key.trim());
}

export function deleteApiKey(): void {
  localStorage.removeItem(API_KEY_LS_KEY);
}
