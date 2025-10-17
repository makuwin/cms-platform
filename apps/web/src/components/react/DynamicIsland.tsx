import { useEffect, useState } from 'react';

type DynamicIslandProps = {
  apiEndpoint: string;
  pollInterval?: number;
};

export default function DynamicIsland({
  apiEndpoint,
  pollInterval = 5000,
}: DynamicIslandProps) {
  const [data, setData] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const response = await fetch(apiEndpoint);
        const json = await response.json();
        if (mounted) {
          setData(json);
          setIsLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setData({ error: (error as Error).message });
          setIsLoading(false);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, pollInterval);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [apiEndpoint, pollInterval]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/10 bg-neutral-900/60 p-4 text-sm text-neutral-400">
        Loading island…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
