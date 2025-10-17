const DEFAULT_API_URL =
  import.meta.env.PUBLIC_API_URL ??
  import.meta.env.API_URL ??
  'http://localhost:3000/api';

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${DEFAULT_API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export type ArticleSummary = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt?: string;
};

export type ArticleDetail = ArticleSummary & {
  content: string;
  author?: {
    name?: string;
  };
};

export async function getArticles(): Promise<ArticleSummary[]> {
  try {
    return await get<ArticleSummary[]>('/content');
  } catch {
    return [];
  }
}

export async function getArticle(slug: string): Promise<ArticleDetail> {
  return get<ArticleDetail>(`/content/${slug}`);
}

export async function getArticleComments(articleId: string) {
  return get<Array<{ id: string; body: string; author: string }>>(
    `/content/${articleId}/comments`,
  );
}
