import { useMemo, useState } from "react";

import { authorizedFetch } from "../../utils/dashboardApi";
import useQuillEditor from "../../hooks/useQuillEditor";
import { stripHtml } from "../../utils/html";
import {
  dispatchDashboardMessage,
  type DashboardTone,
} from "../../utils/dashboardEvents";

type CreateContentCardProps = {
  apiBase: string;
};

const DEFAULT_ERROR = "Unable to create content. Please try again.";

const sendMessage = (message: string, tone: DashboardTone) => {
  dispatchDashboardMessage({ message, tone });
};

const CreateContentCard = ({ apiBase }: CreateContentCardProps) => {
  const [submitting, setSubmitting] = useState(false);

  const normalizedBase = useMemo(
    () => (apiBase && apiBase.length > 0 ? apiBase : ""),
    [apiBase],
  );

  const { editorHostRef, quillReady, html, media } = useQuillEditor({
    apiBase,
    placeholder: "Write your content…",
    initialHtml: "",
    initialMedia: [],
    notify: sendMessage,
  });

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();
    if (submitting) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const slug = String(data.get("slug") ?? "").trim();
    const type = String(data.get("type") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    const bodyHtml = html;

    if (!title || !slug || !type) {
      sendMessage("Title, slug, and type are required.", "error");
      return;
    }

    if (!quillReady || stripHtml(bodyHtml).length === 0) {
      sendMessage("Content body cannot be empty.", "error");
      return;
    }

    const plainBody = stripHtml(bodyHtml);

    const payload: Record<string, unknown> = {
      title,
      slug,
      type,
      data: {
        body: bodyHtml,
        excerpt: description || plainBody.slice(0, 180),
        media,
      },
    };

    if (description) {
      payload.description = description;
    } else if (plainBody) {
      payload.description = plainBody.slice(0, 180);
    }

    setSubmitting(true);
    sendMessage("Creating content…", "info");

    try {
      const response = await authorizedFetch(normalizedBase, "/api/content", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const responseBody = await response
        .json()
        .catch(() => ({ error: DEFAULT_ERROR }));

      if (!response.ok) {
        const message =
          typeof responseBody?.error === "string"
            ? responseBody.error
            : DEFAULT_ERROR;
        sendMessage(message, "error");
        setSubmitting(false);
        return;
      }

      sendMessage("Content created successfully.", "success");
      window.setTimeout(() => window.location.reload(), 900);
    } catch {
      sendMessage(DEFAULT_ERROR, "error");
      setSubmitting(false);
    }
  };

  return (
    <section className="flex flex-col gap-6 rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-100">
      <h2 className="text-xl font-semibold text-slate-900">Create Content</h2>
      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            <span>Title</span>
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              name="title"
              type="text"
              placeholder="Content title"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            <span>Slug</span>
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              name="slug"
              type="text"
              placeholder="my-first-article"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            <span>Type</span>
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              name="type"
              type="text"
              placeholder="article"
              required
            />
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          <span>Description (optional)</span>
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            name="description"
            type="text"
            placeholder="Short description for the content listing"
          />
        </label>

        <div className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          <span>Body</span>
          <div
            ref={editorHostRef}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100"
          />
          {!quillReady && (
            <p className="text-xs text-slate-400">Loading editor…</p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:pointer-events-none disabled:translate-y-0 disabled:shadow-none disabled:opacity-70"
          >
            {submitting ? "Creating…" : "Create Content"}
          </button>
        </div>
      </form>
    </section>
  );
};

export default CreateContentCard;
