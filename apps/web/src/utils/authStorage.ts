const STORAGE_KEY = "novaCmsAuth";

export type StoredTokens = {
  accessToken?: string | null;
  refreshToken?: string | null;
  timestamp?: number;
};

const isBrowser = typeof window !== "undefined";

export const readTokens = (): StoredTokens | null => {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const accessToken =
      typeof parsed.accessToken === "string" ? parsed.accessToken : null;
    const refreshToken =
      typeof parsed.refreshToken === "string" ? parsed.refreshToken : null;
    const timestamp =
      typeof parsed.timestamp === "number" ? parsed.timestamp : Date.now();

    if (!accessToken && !refreshToken) {
      return null;
    }

    return { accessToken, refreshToken, timestamp };
  } catch {
    return null;
  }
};

export const persistTokens = (tokens: StoredTokens | null) => {
  if (!isBrowser) return;

  if (!tokens || (!tokens.accessToken && !tokens.refreshToken)) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  const payload: StoredTokens = {
    accessToken: tokens.accessToken ?? null,
    refreshToken: tokens.refreshToken ?? null,
    timestamp: tokens.timestamp ?? Date.now(),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
};

export const clearTokens = () => {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
};

export const buildAuthHeaders = (accessToken?: string | null) => {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
};

