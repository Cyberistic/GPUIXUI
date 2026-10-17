export function PreviewUnavailable({ reason }: { reason: string }) {
  return (
    <p
      role="note"
      data-preview-tier="unavailable"
      className="not-prose rounded-md border border-dashed border-fd-border bg-fd-card px-3 py-2 text-sm text-fd-muted-foreground"
    >
      Not verified in the GPUix runtime — {reason}.
    </p>
  );
}
