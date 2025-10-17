import { useEffect, useState } from 'react';

const simulateWork = () => {
  const iterations = 1e5;
  let total = 0;
  for (let i = 0; i < iterations; i += 1) {
    total += Math.sqrt(i);
  }
  return total;
};

export default function ExpensiveComponent() {
  const [result, setResult] = useState<number>();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setResult(simulateWork());
    }, 50);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
      <p className="font-semibold">Deferred Analytics</p>
      <p className="mt-1 text-xs">
        Heavy calculation result:{' '}
        {result ? result.toFixed(2) : 'calculating…'}
      </p>
    </div>
  );
}
