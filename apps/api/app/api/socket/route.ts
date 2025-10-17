const encoder = new TextEncoder();

export async function GET() {
  const abort = new AbortController();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        const payload =
          `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      send('connected', { ts: Date.now() });

      const heartbeat = setInterval(() => {
        send('heartbeat', { ts: Date.now() });
      }, 25_000);

      const observeContentUpdates = () => {
        // Placeholder hook for actual pub/sub or database listener.
        const listener = setInterval(() => {
          send('content:update', {
            ts: Date.now(),
            message: 'Demo update - replace with real-time updates.',
          });
        }, 60_000);

        abort.signal.addEventListener('abort', () => clearInterval(listener), {
          once: true,
        });
      };

      observeContentUpdates();

      abort.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        controller.close();
      });
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
