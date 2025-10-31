import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { authorizedFetch } from "../../utils/dashboardApi";
import { stripHtml } from "../../utils/html";
import {
  BLOG_SEARCH_EVENT,
  type BlogSearchDetail,
} from "../../utils/blogEvents";

type BlogListProps = {
  apiBase: string;
  initialContent: BlogEntry[];
  initialQuery?: string;
};

export type BlogEntry = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  author: string;
  type: string;
  publishedAt: string | null;
  bodyHtml: string;
};

type ApiContentItem = {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  description?: string | null;
  createdBy?: {
    name?: string | null;
    email: string;
  } | null;
  publishedAt?: string | null;
  versions?: Array<{
    data?: Record<string, unknown>;
    publishedAt?: string | null;
  }>;
};

const fetchContent = async (
  apiBase: string,
): Promise<ApiContentItem[]> => {
  const response = await authorizedFetch(apiBase, "/api/content");
  if (!response.ok) {
    throw new Error(`Failed to load content (${response.status})`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.content) ? payload.content : [];
};

const mapToBlogEntry = (item: ApiContentItem): BlogEntry | null => {
  if (!item || typeof item !== "object") return null;
  const latestVersion = item.versions?.[0] ?? null;

  const rawData =
    latestVersion &&
    latestVersion.data &&
    typeof latestVersion.data === "object" &&
    !Array.isArray(latestVersion.data)
      ? latestVersion.data
      : {};

  const bodyHtml =
    typeof rawData?.body === "string" ? String(rawData.body) : "";

  const excerpt =
    typeof rawData?.excerpt === "string"
      ? String(rawData.excerpt)
      : item.description ?? "";

  const authorName =
    item.createdBy?.name?.trim() ||
    item.createdBy?.email?.split("@")[0] ||
    "Unknown author";

  const publishedAt =
    item.publishedAt ??
    latestVersion?.publishedAt ??
    null;

  if (!item.slug || bodyHtml.trim().length === 0) {
    return null;
  }

  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    summary: excerpt || stripHtml(bodyHtml).slice(0, 140),
    author: authorName,
    type: item.type ?? "article",
    publishedAt,
    bodyHtml,
  };
};

const BlogList = ({
  apiBase,
  initialContent,
  initialQuery = "",
}: BlogListProps) => {
  const [entries, setEntries] = useState(initialContent);
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(initialContent.length === 0);
  const [error, setError] = useState<string | null>(null);

  const normalizedBase = useMemo(
    () => (apiBase && apiBase.length > 0 ? apiBase : ""),
    [apiBase],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const content = await fetchContent(normalizedBase);
      const mapped = content
        .filter((item) => item.status?.toLowerCase() === "published")
        .map(mapToBlogEntry)
        .filter((entry): entry is BlogEntry => entry !== null)
        .sort((a, b) => {
          const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
          const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
          return bTime - aTime;
        });

      setEntries(mapped);
    } catch (err) {
      console.error("Failed to load blog content", err);
      setError("Unable to load blog posts.");
    } finally {
      setLoading(false);
    }
  }, [normalizedBase]);

  useEffect(() => {
    if (initialContent.length === 0) {
      void load();
    }
  }, [initialContent.length, load]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<BlogSearchDetail>;
      setQuery(custom.detail?.query ?? "");
    };
    window.addEventListener(BLOG_SEARCH_EVENT, handler);
    return () => {
      window.removeEventListener(BLOG_SEARCH_EVENT, handler);
    };
  }, []);

  const filteredEntries = useMemo(() => {
    if (!query.trim()) return entries;
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      return (
        entry.title.toLowerCase().includes(needle) ||
        entry.summary.toLowerCase().includes(needle) ||
        entry.type.toLowerCase().includes(needle)
      );
    });
  }, [entries, query]);

  if (loading) {
    return (
      <section className="flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">Latest Posts</h2>
        <p className="text-sm text-slate-600">
          Fetching the freshest stories…
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex flex-col gap-4 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow">
        <h2 className="text-lg font-semibold">Unable to Load Posts</h2>
        <p className="text-sm">{error}</p>
      </section>
    );
  }

  if (filteredEntries.length === 0) {
    return (
      <section className="flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">Latest Posts</h2>
        <p className="text-sm text-slate-600">
          No posts match your search just yet.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      {filteredEntries.map((entry) => (
        <article
          key={entry.id}
          className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-2xl"
        >
          <header className="flex flex-col gap-2">
            <h3 className="text-2xl font-semibold text-slate-900">
              {entry.title}
            </h3>
            <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>{entry.type}</span>
              {entry.publishedAt && (
                <span>
                  {new Intl.DateTimeFormat(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  }).format(new Date(entry.publishedAt))}
                </span>
              )}
              <span>By {entry.author}</span>
            </div>
          </header>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed text-slate-700 sm:flex-1">
              {entry.summary}
            </p>
            <a
              href={`/blog/${entry.slug
                .split('/')
                .map((segment) => encodeURIComponent(segment))
                .join('/')}`}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-200 sm:ml-4 sm:shrink-0"
            >
              Show more
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </article>
      ))}
    </section>
  );
};

export default BlogList;
