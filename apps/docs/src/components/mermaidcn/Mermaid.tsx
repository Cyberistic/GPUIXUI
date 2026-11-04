import { Effect } from "effect";
import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { renderMermaid } from "../docs/mermaid";
import {
  peleVariables,
  themeVariables,
  type MermaidTheme,
  type MermaidThemeVariables,
} from "./theme";

/**
 * A Mermaid diagram rendered by Pele and themed with CSS variables.
 *
 * The API is mermaidcn's: `<Mermaid chart={...} config={...} />` with
 * `onSuccess`/`onError`. The renderer underneath is Pele, which is synchronous
 * and has no runtime Mermaid.js dependency, so there is no loading state to
 * paint: a source that parses is in the markup on the same render, and a source
 * that does not is the parser's own sentence. Theme names and the eight Mermaid
 * variables keep their mermaidcn spelling; they become `--pele-*` properties on
 * the wrapper, so a theme switch repaints the existing SVG without re-rendering
 * it.
 */

/** The configuration Pele can honour. */
export interface MermaidConfig {
  /** A built-in Mermaid name or one of the named palettes. */
  readonly theme?: MermaidTheme;
  /** Mermaid's eight variables, translated to Pele's roles. */
  readonly themeVariables?: Partial<MermaidThemeVariables>;
  readonly fontFamily?: string;
  readonly fontSize?: number;
  /** The rendered SVG's maximum width, before the frame scales it. */
  readonly maxWidth?: number;
  /** Ask Pele to size the SVG against its container. Default `true`. */
  readonly responsive?: boolean;
}

/** Props for {@link Mermaid}. */
export interface MermaidProps {
  /** The Mermaid source. */
  readonly chart: string;
  readonly config?: MermaidConfig;
  readonly className?: string;
  /** The accessible name of the picture. Default `"Diagram"`. */
  readonly label?: string;
  readonly onError?: (message: string) => void;
  readonly onSuccess?: (svg: string) => void;
}

type Rendered =
  | { readonly status: "idle" }
  | { readonly status: "success"; readonly svg: string }
  | { readonly status: "error"; readonly message: string };

/** The Pele style object, custom properties included. */
const styleOf = (config: MermaidConfig | undefined): CSSProperties => ({
  ...peleVariables(themeVariables(config?.theme)),
  ...peleVariables(config?.themeVariables),
});

/**
 * One diagram. See {@link MermaidProps}.
 */
export function Mermaid({
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
      className={["gx-mermaidcn", className].filter(Boolean).join(" ")}
      data-theme={config?.theme ?? "default"}
      style={styleOf(config)}
    >
      {rendered.status === "success" ? (
        <div
          aria-label={label}
          className="gx-mermaidcn-svg"
          dangerouslySetInnerHTML={{ __html: rendered.svg }}
          role="img"
          suppressHydrationWarning
        />
      ) : null}

      {rendered.status === "error" ? (
        <div className="gx-mermaidcn-state" role="status">
          <span className="gx-mermaidcn-badge">Syntax error</span>
          <p className="gx-mermaidcn-message">
            {rendered.message.length > 200
              ? `${rendered.message.slice(0, 200)}…`
              : rendered.message}
          </p>
        </div>
      ) : null}

      {rendered.status === "idle" ? (
        <div className="gx-mermaidcn-state">
          <p className="gx-mermaidcn-message">
            Enter a Mermaid diagram to see the preview.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** The render options Pele takes from a config. */
export const renderOptionsOf = (
  config: MermaidConfig | undefined,
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
