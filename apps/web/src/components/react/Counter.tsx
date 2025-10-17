import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex items-center gap-4 rounded-lg border border-white/10 bg-neutral-900/60 p-3 text-sm text-neutral-100">
      <button
        className="h-8 w-8 rounded-full border border-white/10 text-lg leading-none hover:border-primary-500 hover:text-primary-300"
        type="button"
        onClick={() => setCount((value) => value - 1)}
      >
        –
      </button>
      <span className="text-lg font-semibold">{count}</span>
      <button
        className="h-8 w-8 rounded-full border border-white/10 text-lg leading-none hover:border-primary-500 hover:text-primary-300"
        type="button"
        onClick={() => setCount((value) => value + 1)}
      >
        +
      </button>
    </div>
  );
}
