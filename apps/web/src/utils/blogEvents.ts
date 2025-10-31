export type BlogSearchDetail = {
  query: string;
};

export const BLOG_SEARCH_EVENT = "blog:search";

export const dispatchBlogSearch = (detail: BlogSearchDetail) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BLOG_SEARCH_EVENT, { detail }));
};

