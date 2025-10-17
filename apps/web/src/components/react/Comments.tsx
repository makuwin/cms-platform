import { useEffect, useMemo, useOptimistic, useState, useTransition } from 'react';

type Comment = {
  id: string;
  text: string;
  author: string;
  createdAt: string;
  replies: Comment[];
};

type ApiComment = {
  id: string;
  body: string;
  author: string;
  createdAt: string;
  replies?: ApiComment[];
};

type CommentsProps = {
  articleId: string;
};

const API_BASE =
  import.meta.env.PUBLIC_API_URL ?? import.meta.env.API_URL ?? 'http://localhost:3000/api';

type CommentResponse = {
  comments: ApiComment[];
};

const mapComment = (comment: ApiComment): Comment => ({
  id: comment.id,
  text: comment.body,
  author: comment.author ?? 'Anonymous',
  createdAt: comment.createdAt,
  replies: (comment.replies ?? []).map(mapComment),
});

async function fetchComments(articleId: string): Promise<Comment[]> {
  const response = await fetch(`${API_BASE}/content/${articleId}/comments`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to load comments');
  }
  const data = (await response.json()) as CommentResponse | ApiComment[];
  if (Array.isArray(data)) return data.map(mapComment);
  return (data.comments ?? []).map(mapComment);
}

async function persistComment(articleId: string, text: string) {
  const response = await fetch(`${API_BASE}/content/${articleId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ body: text }),
  });

  if (!response.ok) {
    throw new Error('Unable to save comment');
  }

  const payload = (await response.json()) as ApiComment;
  return mapComment(payload);
}

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <li className="space-y-3 rounded-xl border border-white/10 bg-neutral-900/70 p-4">
      <header className="flex items-center justify-between text-sm text-neutral-400">
        <span className="font-semibold text-neutral-100">{comment.author}</span>
        <time className="text-xs uppercase tracking-wide">
          {new Date(comment.createdAt).toLocaleString()}
        </time>
      </header>
      <p className="text-sm text-neutral-200">{comment.text}</p>
      {comment.replies?.length ? (
        <ul className="space-y-3 border-l border-white/10 pl-4">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function Comments({ articleId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [optimisticComments, addOptimisticComment] = useOptimistic(
    comments,
    (state, newComment: Comment) => [...state, newComment],
  );

  useEffect(() => {
    let active = true;
    fetchComments(articleId)
      .then((data) => {
        if (!active) return;
        setComments(data);
      })
      .catch((err) => {
        console.error(err);
        if (active) setError('Unable to load comments');
      });
    return () => {
      active = false;
    };
  }, [articleId]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const text = String(formData.get('comment') ?? '').trim();
    if (!text) return;

    const tempId = `temp-${crypto.randomUUID()}`;
    const optimisticEntry: Comment = {
      id: tempId,
      text,
      author: 'You',
      createdAt: new Date().toISOString(),
      replies: [],
    };

    addOptimisticComment(optimisticEntry);
    form.reset();
    setError(null);

    startTransition(() => {
      persistComment(articleId, text)
        .then((saved) => {
          setComments((prev) => {
            const withoutTemp = prev.filter((item) => item.id !== tempId);
            return [...withoutTemp, saved];
          });
        })
        .catch((err) => {
          console.error(err);
          setComments((prev) => prev.filter((item) => item.id !== tempId));
          setError('Failed to save comment, please try again.');
        });
    });
  };

  const list = useMemo(() => optimisticComments, [optimisticComments]);

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold text-neutral-100">Discussion</h2>
        <p className="text-sm text-neutral-400">
          Join the conversation. Comments update optimistically while saving.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-white/10 bg-neutral-900/70 p-4">
        <textarea
          name="comment"
          className="w-full min-h-[120px] resize-y rounded-lg border border-white/10 bg-neutral-950/80 p-3 text-sm text-neutral-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
          placeholder="Leave a comment"
          required
        />
        <div className="flex items-center justify-between text-xs text-neutral-500">
          {error && <span className="text-red-300">{error}</span>}
          <button
            type="submit"
            className="rounded-lg border border-primary-500/40 bg-primary-500/20 px-4 py-2 text-sm font-semibold text-primary-200 hover:bg-primary-500/30 disabled:opacity-60"
            disabled={isPending}
          >
            {isPending ? 'Posting…' : 'Post comment'}
          </button>
        </div>
      </form>

      <ul className="space-y-4">
        {list.length ? (
          list.map((comment) => <CommentItem key={comment.id} comment={comment} />)
        ) : (
          <li className="rounded-xl border border-dashed border-white/10 bg-neutral-900/40 p-6 text-sm text-neutral-400">
            No comments yet. Be the first to share your thoughts.
          </li>
        )}
      </ul>
    </section>
  );
}
