import { Effect } from "effect";
import { useMemo } from "react";
import { renderMermaid } from "./mermaid";

export function MermaidDiagram({
  source,
  caption,
}: {
  readonly source: string;
  readonly caption?: string;
}) {
  const rendered = useMemo(
    () =>
      Effect.runSync(
        Effect.match(renderMermaid(source), {
          onFailure: (error) => ({
            ok: false as const,
            message: error.message,
          }),
          onSuccess: (svg) => ({ ok: true as const, svg }),
        }),
      ),
    [source],
  );

  return (
    <figure className="gx-mermaid">
      {rendered.ok ? (
        <div
          aria-label={caption ?? "Diagram"}
          className="gx-mermaid-svg"
          dangerouslySetInnerHTML={{ __html: rendered.svg }}
          role="img"
          suppressHydrationWarning
        />
      ) : (
        <div className="gx-mermaid-error" role="status">
          <p className="gx-mermaid-error-title">
            This diagram could not be read
          </p>
          <p className="gx-mermaid-error-body">{rendered.message}</p>
          <pre className="gx-mermaid-error-source">{source}</pre>
        </div>
      )}
      {caption === undefined ? null : (
        <figcaption className="gx-mermaid-caption">{caption}</figcaption>
      )}
    </figure>
  );
}
