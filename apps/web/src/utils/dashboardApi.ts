import {
  buildAuthHeaders,
  clearTokens,
  persistTokens,
  readTokens,
  type StoredTokens,
} from "./authStorage";
import { dispatchUserUpdate } from "./dashboardEvents";

const DEFAULT_API_BASE = "http://localhost:3000";

const normalizeBase = (apiBase?: string) => {
  const base = apiBase && apiBase.length > 0 ? apiBase : DEFAULT_API_BASE;
  return base.replace(/\/$/, "");
};

const ensureAbsoluteUrl = (apiBase: string, path: string) => {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = normalizeBase(apiBase);
  if (path.startsWith("/")) {
    return `${normalized}${path}`;
  }
  return `${normalized}/${path}`;
};

type RefreshResponse =
  | {
      accessToken: string;
      refreshToken: string;
      user?: {
        id: string;
        name: string | null;
        email: string;
        role: string;
      };
    }
  | null;

const attemptTokenRefresh = async (
  apiBase: string,
  refreshToken: string,
): Promise<RefreshResponse> => {
  if (!refreshToken) return null;

  try {
    const response = await fetch(
      ensureAbsoluteUrl(apiBase, "/api/auth/refresh"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ refreshToken }),
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json().catch(() => null)) as RefreshResponse;
    if (!data || !data.accessToken || !data.refreshToken) {
      return null;
    }

    persistTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      timestamp: Date.now(),
    });

    if (data.user) {
      dispatchUserUpdate(data.user);
    }

    return data;
  } catch {
    return null;
  }
};

const mergeHeaders = (
  existing: HeadersInit | undefined,
  additions: Record<string, string>,
) => {
  const headers = new Headers(existing ?? {});
  Object.entries(additions).forEach(([key, value]) => {
    if (!headers.has(key) || value !== undefined) {
      headers.set(key, value);
    }
  });
  return headers;
};

export const authorizedFetch = async (
  apiBase: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> => {
  const tokens = readTokens();
  const accessToken = tokens?.accessToken ?? null;

  const headers = mergeHeaders(init.headers, buildAuthHeaders(accessToken));
  const body = init.body ?? null;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  if (body && !headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  const execute = () =>
    fetch(ensureAbsoluteUrl(apiBase, path), {
      ...init,
      headers,
      credentials: "include",
    });

  let response = await execute();

  if (
    (response.status === 401 || response.status === 403) &&
    tokens?.refreshToken
  ) {
    const refreshed = await attemptTokenRefresh(apiBase, tokens.refreshToken);
    if (refreshed?.accessToken) {
      const retryHeaders = mergeHeaders(init.headers, {
        Authorization: `Bearer ${refreshed.accessToken}`,
      });
      if (body && !retryHeaders.has("Content-Type") && !isFormData) {
        retryHeaders.set("Content-Type", "application/json");
      }
      response = await fetch(ensureAbsoluteUrl(apiBase, path), {
        ...init,
        headers: retryHeaders,
        credentials: "include",
      });
    } else if (refreshed === null) {
      clearTokens();
    }
  }

  return response;
};

export const storeTokensFromResponse = (data: {
  accessToken?: string;
  refreshToken?: string;
}) => {
  const payload: StoredTokens = {
    accessToken: data.accessToken ?? null,
    refreshToken: data.refreshToken ?? null,
    timestamp: Date.now(),
  };
  if (!payload.accessToken && !payload.refreshToken) {
    clearTokens();
    return;
  }
  persistTokens(payload);
};
