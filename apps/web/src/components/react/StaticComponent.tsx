export default function StaticComponent() {
  return (
    <div className="rounded-lg border border-white/10 bg-neutral-900/70 p-4 text-sm text-neutral-300">
      This component renders entirely on the server and never hydrates.
    </div>
  );
}
