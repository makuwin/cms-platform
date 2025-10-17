import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const WS_BASE =
  import.meta.env.PUBLIC_WS_URL ?? import.meta.env.WS_URL ?? 'ws://localhost:3000';

type MetricPoint = {
  timestamp: string;
  views: number;
  conversions: number;
};

type TopPerformer = {
  label: string;
  value: number;
};

type DashboardPayload = {
  visitors: number;
  metrics: {
    timeline: MetricPoint[];
    topArticles: TopPerformer[];
  };
};

const FALLBACK_DATA: DashboardPayload = {
  visitors: 42,
  metrics: {
    timeline: Array.from({ length: 12 }).map((_, index) => ({
      timestamp: `Day ${index + 1}`,
      views: Math.round(200 + Math.random() * 120),
      conversions: Math.round(40 + Math.random() * 30),
    })),
    topArticles: [
      { label: 'Content strategy 101', value: 240 },
      { label: 'Understanding WebRTC', value: 180 },
      { label: 'Boosting editorial velocity', value: 156 },
    ],
  },
};

export default function Dashboard() {
  const [liveVisitors, setLiveVisitors] = useState(FALLBACK_DATA.visitors);
  const [metrics, setMetrics] = useState(FALLBACK_DATA.metrics);
  const reconnectTimer = useRef<number | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let shouldReconnect = true;

    const connect = () => {
      try {
        ws = new WebSocket(`${WS_BASE.replace(/\/?$/, '')}/analytics`);
      } catch (error) {
        console.error('Failed to initialise analytics socket', error);
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        console.info('[dashboard] connected to analytics stream');
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as DashboardPayload;
          if (typeof payload.visitors === 'number') {
            setLiveVisitors(payload.visitors);
          }
          if (payload.metrics) {
            setMetrics({
              timeline: payload.metrics.timeline ?? FALLBACK_DATA.metrics.timeline,
              topArticles: payload.metrics.topArticles ?? FALLBACK_DATA.metrics.topArticles,
            });
          }
        } catch (error) {
          console.error('Failed to parse analytics payload', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Analytics socket error', error);
      };

      ws.onclose = () => {
        if (shouldReconnect) {
          scheduleReconnect();
        }
      };
    };

    const scheduleReconnect = () => {
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = window.setTimeout(connect, 3000);
    };

    connect();

    return () => {
      shouldReconnect = false;
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
      ws?.close();
    };
  }, []);

  const chartData = useMemo(() => metrics.timeline, [metrics.timeline]);
  const topArticles = useMemo(() => metrics.topArticles, [metrics.topArticles]);

  return (
    <section className="space-y-6 rounded-xl border border-white/10 bg-neutral-900/60 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-100">Live Analytics</h2>
          <p className="text-sm text-neutral-400">
            Real-time engagement across the CMS platform.
          </p>
        </div>
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-right">
          <p className="text-xs uppercase tracking-wide text-emerald-200">
            Live visitors
          </p>
          <p className="text-3xl font-semibold text-emerald-100">{liveVisitors}</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-xl border border-white/10 bg-neutral-950/40 p-4">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Traffic vs conversions
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="timestamp" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  background: '#111827',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.75rem',
                  color: '#e5e7eb',
                }}
              />
              <Line type="monotone" dataKey="views" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="conversions" stroke="#22d3ee" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-white/10 bg-neutral-950/40 p-4">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Top performing articles
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topArticles}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 12 }} interval={0} angle={-15} dy={10} />
              <YAxis stroke="#9ca3af" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: '#111827',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.75rem',
                  color: '#e5e7eb',
                }}
              />
              <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
