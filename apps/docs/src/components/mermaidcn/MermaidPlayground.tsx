import { useDeferredValue, useMemo, useState } from "react";
import { writeClipboard } from "@/lib/clipboard";
import { Mermaid, type MermaidConfig } from "./Mermaid";
import { MermaidEditor } from "./MermaidEditor";
import { ZoomPan } from "./ZoomPan";
import {
  builtinThemes,
  isMermaidTheme,
  mermaidThemes,
  themeSwatch,
  type MermaidTheme,
} from "./theme";
import {
  defaultTemplate,
  diagramTemplates,
  type DiagramTemplate,
} from "./templates";

/**
 * The full mermaidcn playground: a source field, a live Pele preview, a
 * template picker, a theme picker and the preview's zoom controls.
 *
 * The preview is deferred one render behind the field, so a fast typist does
 * not pay for a diagram parse on every keystroke while the source still
 * follows the caret. Pele is synchronous, so there is no loading state between
 * the deferred source and the picture; an invalid diagram shows the parser's
 * sentence in the preview.
 */

/** Props for {@link MermaidPlayground}. */
export interface MermaidPlaygroundProps {
  readonly defaultValue?: string;
  readonly className?: string;
}

const THEMES: ReadonlyArray<{
  readonly value: MermaidTheme;
  readonly label: string;
}> = [
  ...builtinThemes.map((value) => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
  })),
  ...Object.keys(mermaidThemes)
    .filter(isMermaidTheme)
    .map((value) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1),
    })),
];

const findTemplate = (id: string): DiagramTemplate | undefined =>
  diagramTemplates.find((template) => template.id === id);

/** The playground. See {@link MermaidPlaygroundProps}. */
export function MermaidPlayground({
  defaultValue,
  className,
}: MermaidPlaygroundProps) {
  const [code, setCode] = useState(
    defaultValue ?? defaultTemplate?.chart ?? "",
  );
  const [template, setTemplate] = useState(defaultTemplate?.id ?? "custom");
  const [theme, setTheme] = useState<MermaidTheme>("default");
  const [svg, setSvg] = useState("");
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const deferred = useDeferredValue(code);
  const config = useMemo<MermaidConfig>(() => ({ theme }), [theme]);

  const load = (id: string): void => {
    const next = findTemplate(id);
    setTemplate(id);
    if (next !== undefined) {
      setCode(next.chart);
      setCopied("idle");
    }
  };

  const copy = (): void => {
    void writeClipboard(svg).then((ok) => setCopied(ok ? "copied" : "failed"));
  };

  const download = (): void => {
    if (svg === "") return;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.download = "mermaid-diagram.svg";
    anchor.href = url;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={["gx-mermaidcn-playground", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="gx-mermaidcn-toolbar">
        <label className="gx-mermaidcn-field">
          <span>Template</span>
          <select
            onChange={(event) => load(event.target.value)}
            value={template}
          >
            {diagramTemplates.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
            <option disabled value="custom">
              Custom source
            </option>
          </select>
        </label>

        <label className="gx-mermaidcn-field">
          <span>Theme</span>
          <span className="gx-mermaidcn-theme">
            <i
              aria-hidden="true"
              style={{ backgroundColor: themeSwatch(theme) }}
            />
            <select
              onChange={(event) => {
                const next = event.target.value;
                if (isMermaidTheme(next)) setTheme(next);
              }}
              value={theme}
            >
              {THEMES.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </span>
        </label>

        <span className="gx-mermaidcn-spacer" />

        <button
          className="gx-btn gx-btn-outline gx-btn-sm"
          onClick={() => load(defaultTemplate?.id ?? "sequence-api")}
          type="button"
        >
          Reset
        </button>
      </div>

      <div className="gx-mermaidcn-split">
        <MermaidEditor
          className="gx-mermaidcn-source"
          onChange={(value) => {
            setCode(value);
            setTemplate("custom");
            setCopied("idle");
          }}
          value={code}
        />

        <div className="gx-mermaidcn-preview">
          <ZoomPan
            className="gx-mermaidcn-canvas"
            fitOn={template}
            controls={({
              zoomIn,
              zoomOut,
              resetZoom,
              centerView,
              scalePercent,
            }) => (
              <div className="gx-mermaidcn-preview-bar">
                <span className="gx-mermaidcn-preview-label">Preview</span>
                <div className="gx-mermaidcn-controls">
                  <button
                    aria-label="Zoom out"
                    className="gx-btn gx-btn-ghost gx-btn-sm gx-btn-square gx-mermaidcn-control"
                    onClick={zoomOut}
                    type="button"
                  >
                    −
                  </button>
                  <button
                    aria-label="Reset zoom"
                    className="gx-btn gx-btn-ghost gx-btn-sm gx-mermaidcn-percent"
                    onClick={resetZoom}
                    type="button"
                  >
                    {scalePercent}%
                  </button>
                  <button
                    aria-label="Zoom in"
                    className="gx-btn gx-btn-ghost gx-btn-sm gx-btn-square gx-mermaidcn-control"
                    onClick={zoomIn}
                    type="button"
                  >
                    +
                  </button>
                  <button
                    className="gx-btn gx-btn-ghost gx-btn-sm gx-mermaidcn-control gx-mermaidcn-control-wide"
                    onClick={centerView}
                    type="button"
                  >
                    Fit
                  </button>
                  <button
                    className="gx-btn gx-btn-ghost gx-btn-sm gx-mermaidcn-control gx-mermaidcn-control-wide"
                    disabled={svg === ""}
                    onClick={copy}
                    type="button"
                  >
                    {copied === "copied"
                      ? "Copied"
                      : copied === "failed"
                        ? "Copy failed"
                        : "Copy SVG"}
                  </button>
                  <button
                    className="gx-btn gx-btn-ghost gx-btn-sm gx-mermaidcn-control gx-mermaidcn-control-wide"
                    disabled={svg === ""}
                    onClick={download}
                    type="button"
                  >
                    Download
                  </button>
                </div>
              </div>
            )}
          >
            <Mermaid
              chart={deferred}
              config={config}
              onError={() => setSvg("")}
              onSuccess={setSvg}
            />
          </ZoomPan>
        </div>
      </div>
    </div>
  );
}
