export type DashboardTone = "info" | "success" | "error";

export type DashboardMessageDetail =
  | {
      message: string;
      tone: DashboardTone;
    }
  | null;

export type DashboardContentMedia = {
  id?: string;
  filename?: string;
  url: string;
  mimeType?: string;
};

export type DashboardContentEntry = {
  id: string;
  title: string;
  slug: string;
  status: string;
  type: string;
  description: string;
  summary?: string | null;
  bodyHtml: string;
  media: DashboardContentMedia[];
  excerpt?: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
  authorName: string;
  editorName?: string | null;
};

export type DashboardUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

export const DASHBOARD_MESSAGE_EVENT = "dashboard:message";
export const DASHBOARD_CONTENT_CREATED_EVENT = "dashboard:content-created";
export const DASHBOARD_CONTENT_UPDATED_EVENT = "dashboard:content-updated";
export const DASHBOARD_CONTENT_DELETED_EVENT = "dashboard:content-deleted";
export const DASHBOARD_USER_EVENT = "dashboard:user-update";

export const dispatchDashboardMessage = (detail: DashboardMessageDetail) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(DASHBOARD_MESSAGE_EVENT, { detail: detail ?? undefined }),
  );
};

export const dispatchContentCreated = (detail: DashboardContentEntry) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(DASHBOARD_CONTENT_CREATED_EVENT, { detail }),
  );
};

export const dispatchContentUpdated = (detail: DashboardContentEntry) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(DASHBOARD_CONTENT_UPDATED_EVENT, { detail }),
  );
};

export const dispatchContentDeleted = (id: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(DASHBOARD_CONTENT_DELETED_EVENT, { detail: { id } }),
  );
};

export const dispatchUserUpdate = (user: DashboardUser | null) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(DASHBOARD_USER_EVENT, { detail: user ?? undefined }),
  );
};
