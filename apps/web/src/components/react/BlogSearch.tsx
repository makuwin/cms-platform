import { useEffect, useState } from "react";

import { BLOG_SEARCH_EVENT, dispatchBlogSearch } from "../../utils/blogEvents";

type BlogSearchProps = {
  initialQuery?: string;
};

const BlogSearch = ({ initialQuery = "" }: BlogSearchProps) => {
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    dispatchBlogSearch({ query: initialQuery });
  }, [initialQuery]);

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    dispatchBlogSearch({ query: nextQuery });
  };

  return (
    <section className="relative">
      <input
        type="search"
        placeholder="Search blog posts..."
        value={query}
        onChange={handleChange}
        className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-900 shadow-lg transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
    </section>
  );
};

export default BlogSearch;
