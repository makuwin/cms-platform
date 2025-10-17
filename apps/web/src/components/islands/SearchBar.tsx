import { useState } from 'react';

export default function SearchBar() {
  const [query, setQuery] = useState('');

  return (
    <form
      className="hidden items-center gap-2 rounded-full border border-white/10 bg-neutral-900/80 px-4 py-2 text-sm text-neutral-200 md:flex"
      action="/search"
      method="get"
    >
      <input
        className="bg-transparent text-sm outline-none placeholder:text-neutral-500"
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search content…"
      />
      <button
        type="submit"
        className="rounded-full bg-primary-500/30 px-3 py-1 text-xs font-semibold text-primary-100 hover:bg-primary-500/50"
      >
        Go
      </button>
    </form>
  );
}
