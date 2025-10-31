import { useCallback, useMemo, useState } from "react";

import { authorizedFetch } from "../../utils/dashboardApi";
import {
  dispatchDashboardMessage,
  type DashboardContentEntry,
  type DashboardTone,
} from "../../utils/dashboardEvents";

type ContentListProps = {
  apiBase: string;
  initialContent: DashboardContentEntry[];
};

const DEFAULT_DELETE_ERROR = "Unable to delete content. Please try again.";

const notifyDashboard = (message: string, tone: DashboardTone) => {
  dispatchDashboardMessage({ message, tone });
};

const formatDate = (formatter: Intl.DateTimeFormat, value?: string | null) => {
  if (!value) return null;
  try {
    return formatter.format(new Date(value));
  } catch {
    return null;
  }
};

const statusOptions = ["draft", "review", "published", "archived"] as const;

const ContentList = ({ apiBase, initialContent }: ContentListProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const normalizedBase = useMemo(
    () => (apiBase && apiBase.length > 0 ? apiBase : ""),
    [apiBase],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [],
  );

  const handleStatusChange = useCallback(
    async (contentId: string, nextStatus: string) => {
      if (!contentId || !nextStatus) return;

      setStatusUpdatingId(contentId);
      notifyDashboard("Updating status…", "info");

      try {
        const response = await authorizedFetch(
          normalizedBase,
          `/api/content/${contentId}/status`,
          {
            method: "PATCH",
            body: JSON.stringify({ status: nextStatus }),
          },
        );

        if (!response.ok) {
          const payload = await response
            .json()
            .catch(() => ({ error: "Unable to update status." }));
          const message =
            typeof payload?.error === "string"
              ? payload.error
              : "Unable to update status.";
          notifyDashboard(message, "error");
          setStatusUpdatingId(null);
          return;
        }

        notifyDashboard("Status updated successfully.", "success");
        window.setTimeout(() => window.location.reload(), 600);
      } catch (error) {
        console.error("Failed to update status", error);
        notifyDashboard("Unable to update status.", "error");
        setStatusUpdatingId(null);
      }
    },
    [normalizedBase],
  );

  const handleDelete = useCallback(
    async (contentId: string) => {
      if (!contentId) {
        notifyDashboard("Missing content id for deletion.", "error");
        return;
      }

      const confirmed = window.confirm("Delete this content permanently?");
      if (!confirmed) return;

      setDeletingId(contentId);
      notifyDashboard("Deleting content…", "info");

      try {
        const response = await authorizedFetch(
          normalizedBase,
          `/api/content/${contentId}`,
          {
            method: "DELETE",
          },
        );

        if (response.status === 204) {
          notifyDashboard("Content deleted successfully.", "success");
          window.setTimeout(() => window.location.reload(), 600);
          return;
        }

        const responseBody = await response
          .json()
          .catch(() => ({ error: DEFAULT_DELETE_ERROR }));

        if (!response.ok) {
          const message =
            typeof responseBody?.error === "string"
              ? responseBody.error
              : DEFAULT_DELETE_ERROR;
          notifyDashboard(message, "error");
          setDeletingId(null);
          return;
        }

        notifyDashboard("Content deleted successfully.", "success");
        window.setTimeout(() => window.location.reload(), 600);
      } catch {
        notifyDashboard(DEFAULT_DELETE_ERROR, "error");
        setDeletingId(null);
      }
    },
    [normalizedBase],
  );

  if (initialContent.length === 0) {
    return (
      <section className="flex flex-col gap-6 rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-100">
        <h2 className="text-xl font-semibold text-slate-900">Existing Content</h2>
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No content yet. Create your first entry above.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6 rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-100">
      <h2 className="text-xl font-semibold text-slate-900">Existing Content</h2>
      <div className="grid gap-6">
        {initialContent.map((entry) => {
          const publishedDisplay = formatDate(dateFormatter, entry.publishedAt);
          const updatedDisplay = formatDate(dateFormatter, entry.updatedAt);
          return (
            <article
              key={entry.id}
              className="flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-slate-50 p-6 shadow-sm"
            >
              <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {entry.title}
                    </h3>
                    {entry.description && (
                      <p className="mt-1 text-sm text-slate-600">
                        {entry.description}
                      </p>
                    )}
                  </div>
                  <p className="flex flex-wrap gap-3 text-sm text-slate-600">
                    <span>
                      Slug:
                      <code className="ml-1 rounded bg-slate-900/10 px-1.5 py-0.5 font-mono text-xs text-slate-800">
                        {entry.slug}
                      </code>
                    </span>
                    <span>Type: {entry.type}</span>
                    <span>Status: {entry.status}</span>
                    <span>Author: {entry.authorName}</span>
                    {entry.editorName && <span>Last Editor: {entry.editorName}</span>}
                    {publishedDisplay && <span>Published: {publishedDisplay}</span>}
                    {updatedDisplay && <span>Updated: {updatedDisplay}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span>Status</span>
                    <select
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-indigo-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      value={entry.status}
                      disabled={statusUpdatingId === entry.id}
                      onChange={(event) =>
                        handleStatusChange(entry.id, event.target.value)
                      }
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
                    onClick={() => {
                      window.location.href = `/dashboard/edit/${entry.id}`;
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    disabled={deletingId === entry.id}
                    className="inline-flex items-center justify-center rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
                  >
                    {deletingId === entry.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </header>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default ContentList;
