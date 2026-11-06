import { Effect } from "effect";
import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { renderMermaid } from "../docs/mermaid";
import {
  peleVariables,
  themeVariables,
  type DiagramTheme,
  type DiagramThemeVariables,
} from "./theme";

export interface DiagramConfig {
  readonly theme?: DiagramTheme;

  readonly themeVariables?: Partial<DiagramThemeVariables>;
  readonly fontFamily?: string;
  readonly fontSize?: number;

  readonly maxWidth?: number;

  readonly responsive?: boolean;
}

export interface MermaidProps {
  readonly chart: string;
  readonly config?: DiagramConfig;
  readonly className?: string;

  readonly label?: string;
  readonly onError?: (message: string) => void;
  readonly onSuccess?: (svg: string) => void;
}

type Rendered =
  | { readonly status: "idle" }
  | { readonly status: "success"; readonly svg: string }
  | { readonly status: "error"; readonly message: string };

const styleOf = (config: DiagramConfig | undefined): CSSProperties => ({
  ...peleVariables(themeVariables(config?.theme)),
  ...peleVariables(config?.themeVariables),
});

export function DiagramView({
  chart,
  config,
  className,
  label = "Diagram",
  onError,
  onSuccess,
}: MermaidProps) {
  const rendered = useMemo<Rendered>(() => {
    const source = chart.trim();
    if (source === "") return { status: "idle" };
    return Effect.runSync(
      Effect.match(renderMermaid(source, renderOptionsOf(config)), {
        onFailure: (error) => ({
          status: "error" as const,
          message: error.message,
        }),
        onSuccess: (svg) => ({ status: "success" as const, svg }),
      }),
    );
  }, [chart, config]);

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (rendered.status === "success") onSuccessRef.current?.(rendered.svg);
    if (rendered.status === "error") onErrorRef.current?.(rendered.message);
  }, [rendered]);

  return (
    <div
      className={["gx-diagram", className].filter(Boolean).join(" ")}
      data-theme={config?.theme ?? "default"}
      style={styleOf(config)}
    >
      {rendered.status === "success" ? (
        <div
          aria-label={label}
          className="gx-diagram-svg"
          dangerouslySetInnerHTML={{ __html: rendered.svg }}
          role="img"
          suppressHydrationWarning
        />
      ) : null}

      {rendered.status === "error" ? (
        <div className="gx-diagram-state" role="status">
          <span className="gx-diagram-badge">Syntax error</span>
          <p className="gx-diagram-message">
            {rendered.message.length > 200
              ? `${rendered.message.slice(0, 200)}…`
              : rendered.message}
          </p>
        </div>
      ) : null}

      {rendered.status === "idle" ? (
        <div className="gx-diagram-state">
          <p className="gx-diagram-message">
            Enter a Mermaid diagram to see the preview.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export const renderOptionsOf = (
  config: DiagramConfig | undefined,
): {
  readonly fontFamily?: string;
  readonly fontSize?: number;
  readonly maxWidth?: number;
  readonly responsive?: boolean;
} => ({
  fontFamily: config?.fontFamily,
  fontSize: config?.fontSize,
  maxWidth: config?.maxWidth,
  responsive: config?.responsive,
});
