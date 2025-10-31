import { useEffect, useMemo, useState } from "react";

import {
  DASHBOARD_MESSAGE_EVENT,
  DASHBOARD_USER_EVENT,
  type DashboardMessageDetail,
  type DashboardUser,
} from "../../utils/dashboardEvents";

type DashboardProps = {
  userName: string;
  role: string;
  loadError: string | null;
};

const toneClasses: Record<
  NonNullable<DashboardMessageDetail>["tone"],
  string
> = {
  info: "border-indigo-100 bg-indigo-50 text-indigo-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-rose-200 bg-rose-50 text-rose-700",
};

const DashboardShell = ({ userName, role, loadError }: DashboardProps) => {
  const fallbackName = useMemo(() => {
    const trimmed = userName.trim();
    if (trimmed.length > 0) return trimmed;
    return "Unknown user";
  }, [userName]);

  const [currentName, setCurrentName] = useState(fallbackName);
  const [currentRole, setCurrentRole] = useState(role);
  const [alert, setAlert] = useState<DashboardMessageDetail>(null);

  useEffect(() => {
    setCurrentName(fallbackName);
  }, [fallbackName]);

  useEffect(() => {
    setCurrentRole(role);
  }, [role]);

  useEffect(() => {
    const handleMessage = (event: Event) => {
      const messageEvent = event as CustomEvent<DashboardMessageDetail>;
      const detail = messageEvent.detail;
      if (!detail || !detail.message) {
        setAlert(null);
        return;
      }
      setAlert(detail);
    };

    const handleUserUpdate = (event: Event) => {
      const userEvent = event as CustomEvent<DashboardUser | undefined>;
      const detail = userEvent.detail;
      if (!detail) return;
      const nextName =
        detail.name && detail.name.trim().length > 0
          ? detail.name
          : detail.email.split("@")[0];
      setCurrentName(nextName);
      if (detail.role) {
        setCurrentRole(detail.role.toLowerCase());
      }
    };

    window.addEventListener(
      DASHBOARD_MESSAGE_EVENT,
      handleMessage as EventListener,
    );
    window.addEventListener(
      DASHBOARD_USER_EVENT,
      handleUserUpdate as EventListener,
    );

    return () => {
      window.removeEventListener(
        DASHBOARD_MESSAGE_EVENT,
        handleMessage as EventListener,
      );
      window.removeEventListener(
        DASHBOARD_USER_EVENT,
        handleUserUpdate as EventListener,
      );
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-4xl font-semibold text-slate-900 lg:text-5xl">
            Dashboard
          </h1>
          <div className="flex items-center gap-3 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
            <span className="text-sm normal-case text-slate-900">
              {currentName}
            </span>
            <span className="rounded-full border border-indigo-200 bg-white px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-indigo-600">
              {currentRole}
            </span>
          </div>
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          Create, edit, and publish content entries for your workspace. All
          changes are synced with the NovaCMS API.
        </p>
      </section>

      <section
        className={[
          "rounded-2xl border px-4 py-3 text-sm font-semibold transition",
          alert && alert.message
            ? toneClasses[alert.tone]
            : "hidden border-indigo-100 bg-indigo-50 text-indigo-700",
        ].join(" ")}
      >
        {alert?.message}
      </section>

      {loadError && (
        <section className="rounded-3xl border-l-4 border-rose-500 bg-white p-6 text-slate-600 shadow-xl ring-1 ring-slate-100">
          <p>{loadError}</p>
        </section>
      )}
    </div>
  );
};

export default DashboardShell;

