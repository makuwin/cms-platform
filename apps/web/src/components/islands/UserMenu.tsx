import { useState } from 'react';

export default function UserMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-neutral-900/80 text-sm font-semibold text-neutral-100 hover:border-primary-500 hover:text-primary-300"
      >
        MW
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-neutral-900/90 p-3 text-sm text-neutral-200 shadow-lg shadow-black/30">
          <p className="px-2 py-1 text-xs uppercase tracking-wide text-neutral-500">
            Signed in as
          </p>
          <p className="px-2 py-1 font-semibold text-neutral-100">
            markwin@example.com
          </p>
          <hr className="my-2 border-white/10" />
          <a className="block rounded-md px-2 py-1 hover:bg-primary-500/20" href="/dashboard">
            Dashboard
          </a>
          <a className="block rounded-md px-2 py-1 hover:bg-primary-500/20" href="/settings">
            Settings
          </a>
          <button
            type="button"
            className="mt-2 w-full rounded-md border border-white/10 px-2 py-1 text-left text-sm text-neutral-300 hover:border-primary-500/40 hover:text-primary-200"
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
