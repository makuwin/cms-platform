import { useMemo, useState } from "react";

type SignUpCardProps = {
  apiBase: string;
};

type MessageTone = "idle" | "info" | "success" | "error";

const STORAGE_KEY = "novaCmsAuth";

const SignUpCard = ({ apiBase }: SignUpCardProps) => {
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<MessageTone>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registerEndpoint = useMemo(() => {
    const normalized = (apiBase || "http://localhost:3000").replace(/\/$/, "");
    return `${normalized}/api/auth/register`;
  }, [apiBase]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    if (!name || !email || !password) {
      setTone("error");
      setMessage("Name, email, and password are required.");
      return;
    }

    setTone("info");
    setMessage("Creating your account…");
    setIsSubmitting(true);

    try {
      const response = await fetch(registerEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage =
          payload && typeof payload.error === "string"
            ? payload.error
            : "Unable to sign up. Please try again.";
        throw new Error(errorMessage);
      }

      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            user: payload.user ?? null,
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
            timestamp: Date.now(),
          }),
        );
      } catch (_error) {
        /* ignore storage failures */
      }

      setTone("success");
      setMessage("Account created! Redirecting…");

      window.setTimeout(() => {
        window.location.href = "/";
      }, 900);
    } catch (error) {
      const fallback =
        error instanceof Error ? error.message : "Unexpected error. Please retry.";
      setTone("error");
      setMessage(fallback);
      setIsSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Jordan Carter"
          required
          className="rounded-xl border border-indigo-100 px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          className="rounded-xl border border-indigo-100 px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Create a strong password"
          required
          className="rounded-xl border border-indigo-100 px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:pointer-events-none disabled:translate-y-0 disabled:shadow-none disabled:opacity-70"
      >
        {isSubmitting ? "Creating…" : "Create Account"}
      </button>

      <p
        role="status"
        aria-live="polite"
        className={[
          "min-h-[1.5rem] text-sm",
          tone === "error"
            ? "text-rose-600"
            : tone === "success"
              ? "text-emerald-600"
              : "text-slate-600",
        ].join(" ")}
      >
        {message}
      </p>
    </form>
  );
};

export default SignUpCard;

