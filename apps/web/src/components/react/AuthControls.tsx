import { useCallback, useEffect, useMemo, useState } from "react";

type AuthUser = {
  id: string;
  email?: string;
  name?: string;
  role?: string;
};

type StoredTokens = {
  accessToken?: string | null;
  refreshToken?: string | null;
  user?: AuthUser | null;
};

type AuthControlsProps = {
  apiBase: string;
  initialUser?: AuthUser | null;
};

const STORAGE_KEY = "novaCmsAuth";

const readTokens = (): StoredTokens | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const accessToken =
      typeof parsed.accessToken === "string" ? parsed.accessToken : null;
    const refreshToken =
      typeof parsed.refreshToken === "string" ? parsed.refreshToken : null;
    const cachedUser =
      parsed && typeof parsed.user === "object" ? (parsed.user as AuthUser) : null;
    if (!accessToken && !refreshToken && !cachedUser) return null;
    return { accessToken, refreshToken, user: cachedUser };
  } catch {
    return null;
  }
};

const persistTokens = (tokens: StoredTokens) => {
  if (typeof window === "undefined") return;
  const payload: Record<string, unknown> = { timestamp: Date.now() };
  if (tokens.accessToken) payload.accessToken = tokens.accessToken;
  if (tokens.refreshToken) payload.refreshToken = tokens.refreshToken;
  if (tokens.user) payload.user = tokens.user;

  if (!payload.accessToken && !payload.refreshToken && !payload.user) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage failures
  }
};

const clearTokens = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
};

const buildHeaders = (accessToken?: string | null) => {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
};

const AuthControls = ({ apiBase, initialUser = null }: AuthControlsProps) => {
  const [user, setUser] = useState<AuthUser | null>(initialUser ?? null);
  const [loading, setLoading] = useState(!initialUser);
  const [signingOut, setSigningOut] = useState(false);

  const normalizedBase = useMemo(
    () => (apiBase || "http://localhost:3000").replace(/\/$/, ""),
    [apiBase],
  );

  const refreshTokens = useCallback(
    async (refreshToken: string): Promise<AuthUser | null> => {
      try {
        const response = await fetch(`${normalizedBase}/api/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          return null;
        }

        const data = await response.json().catch(() => null);
        if (!data || !data.accessToken || !data.refreshToken) {
          return null;
        }

        persistTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user ?? null,
        });

        return data.user ?? null;
      } catch {
        return null;
      }
    },
    [normalizedBase],
  );

  const loadSession = useCallback(async (): Promise<AuthUser | null> => {
    const tokens = readTokens();
    try {
      const response = await fetch(`${normalizedBase}/api/auth/me`, {
        method: "GET",
        headers: buildHeaders(tokens?.accessToken ?? undefined),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        const nextUser = data && data.user ? data.user : tokens?.user ?? null;
        persistTokens({
          accessToken: tokens?.accessToken ?? null,
          refreshToken: tokens?.refreshToken ?? null,
          user: nextUser,
        });
        return nextUser;
      }

      if (
        (response.status === 401 || response.status === 403) &&
        tokens?.refreshToken
      ) {
        const refreshedUser = await refreshTokens(tokens.refreshToken);
        if (refreshedUser) {
          return refreshedUser;
        }
        clearTokens();
        return null;
      }

      if (response.status === 401 || response.status === 403) {
        clearTokens();
        return null;
      }

      return null;
    } catch {
      return tokens?.user ?? null;
    }
  }, [normalizedBase, refreshTokens]);

  useEffect(() => {
    if (!initialUser) {
      // Ensure we attempt to hydrate from cached tokens after mount to avoid SSR mismatch.
      const cached = readTokens();
      if (cached?.user) {
        setUser((prev) => prev ?? cached.user ?? null);
        setLoading(false);
      }
      return;
    }

    persistTokens({
      accessToken: readTokens()?.accessToken ?? null,
      refreshToken: readTokens()?.refreshToken ?? null,
      user: initialUser,
    });
    setUser(initialUser);
    setLoading(false);
  }, [initialUser]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      const nextUser = await loadSession();
      if (!active) return;
      setUser(nextUser);
      setLoading(false);
    };

    void run();

    const handleFocus = () => {
      void run();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      active = false;
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadSession]);

  const handleSignOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    clearTokens();
    setUser(null);

    try {
      await fetch(`${normalizedBase}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore network failures; client state already cleared
    }

    window.location.href = "/";
  }, [normalizedBase, signingOut]);

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-24 animate-pulse rounded-full bg-slate-200" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <a
          href="/sign-in"
          className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          Sign In
        </a>
      </div>
    );
  }

  const normalizedRole = (user.role ?? '').toLowerCase();
  const canAccessDashboard = normalizedRole !== 'viewer';

  return (
    <div className="flex items-center gap-3">
      {canAccessDashboard && (
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          Dashboard
        </a>
      )}
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="inline-flex items-center justify-center rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:-translate-y-0.5 hover:bg-rose-600 disabled:translate-y-0 disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
      >
        {signingOut ? "Signing out…" : "Sign Out"}
      </button>
    </div>
  );
};

export default AuthControls;
