export function PlaygroundScreen({ screen }: { screen: string }) {
  return (
    <p
      data-preview-tier="playground"
      className="not-prose rounded-md border border-fd-border bg-fd-card px-3 py-2 text-sm"
    >
      Run it natively: <code>nub run dev:playground</code> →{" "}
      <strong>{screen}</strong>
    </p>
  );
}
