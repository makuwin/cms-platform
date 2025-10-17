import { useState } from 'react';

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-md border border-white/10 px-3 py-2 text-sm text-neutral-200"
      >
        {open ? 'Close' : 'Menu'}
      </button>
      {open ? (
        <nav className="mt-3 space-y-2 rounded-lg border border-white/10 bg-neutral-900/70 p-4 text-sm text-neutral-100">
          <a className="block rounded-md px-3 py-2 hover:bg-primary-500/20" href="/blog">
            Blog
          </a>
          <a className="block rounded-md px-3 py-2 hover:bg-primary-500/20" href="/dashboard">
            Dashboard
          </a>
          <a className="block rounded-md px-3 py-2 hover:bg-primary-500/20" href="/about">
            About
          </a>
        </nav>
      ) : null}
    </div>
  );
}
