import { useDeferredValue, useMemo, useState } from "react";
import { writeClipboard } from "@/lib/clipboard";
import { DiagramView, type DiagramConfig } from "./DiagramView";
import { DiagramEditor } from "./DiagramEditor";
import { ZoomPan } from "./ZoomPan";
import {
  builtinThemes,
  isDiagramTheme,
  mermaidThemes,
  themeSwatch,
  type DiagramTheme,
} from "./theme";
import {
  defaultTemplate,
  diagramTemplates,
  type DiagramTemplate,
} from "./templates";

export interface DiagramPlaygroundProps {
  readonly defaultValue?: string;
  readonly className?: string;
}

const THEMES: ReadonlyArray<{
  readonly value: DiagramTheme;
  readonly label: string;
}> = [
  ...builtinThemes.map((value) => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
  })),
  ...Object.keys(mermaidThemes)
    .filter(isDiagramTheme)
    .map((value) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1),
    })),
];

const findTemplate = (id: string): DiagramTemplate | undefined =>
  diagramTemplates.find((template) => template.id === id);

export function DiagramPlayground({
  defaultValue,
  className,
}: DiagramPlaygroundProps) {
  const [code, setCode] = useState(
    defaultValue ?? defaultTemplate?.chart ?? "",
  );
  const [template, setTemplate] = useState(defaultTemplate?.id ?? "custom");
  const [theme, setTheme] = useState<DiagramTheme>("default");
  const [svg, setSvg] = useState("");
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const deferred = useDeferredValue(code);
  const config = useMemo<DiagramConfig>(() => ({ theme }), [theme]);

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
      className={["gx-diagram-playground", className].filter(Boolean).join(" ")}
    >
      <div className="gx-diagram-toolbar">
        <label className="gx-diagram-field">
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

        <label className="gx-diagram-field">
          <span>Theme</span>
          <span className="gx-diagram-theme">
            <i
              aria-hidden="true"
              style={{ backgroundColor: themeSwatch(theme) }}
            />
            <select
              onChange={(event) => {
                const next = event.target.value;
                if (isDiagramTheme(next)) setTheme(next);
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

        <span className="gx-diagram-spacer" />

        <button
          className="gx-btn gx-btn-outline gx-btn-sm"
          onClick={() => load(defaultTemplate?.id ?? "sequence-api")}
          type="button"
        >
          Reset
        </button>
      </div>

      <div className="gx-diagram-split">
        <DiagramEditor
          className="gx-diagram-source"
          onChange={(value) => {
            setCode(value);
            setTemplate("custom");
            setCopied("idle");
          }}
          value={code}
        />

        <div className="gx-diagram-preview">
          <ZoomPan
            className="gx-diagram-canvas"
            fitOn={template}
            controls={({
              zoomIn,
              zoomOut,
              resetZoom,
              centerView,
              scalePercent,
            }) => (
              <div className="gx-diagram-preview-bar">
                <span className="gx-diagram-preview-label">Preview</span>
                <div className="gx-diagram-controls">
                  <button
                    aria-label="Zoom out"
                    className="gx-btn gx-btn-ghost gx-btn-sm gx-btn-square gx-diagram-control"
                    onClick={zoomOut}
                    type="button"
                  >
                    −
                  </button>
                  <button
                    aria-label="Reset zoom"
                    className="gx-btn gx-btn-ghost gx-btn-sm gx-diagram-percent"
                    onClick={resetZoom}
                    type="button"
                  >
                    {scalePercent}%
                  </button>
                  <button
                    aria-label="Zoom in"
                    className="gx-btn gx-btn-ghost gx-btn-sm gx-btn-square gx-diagram-control"
                    onClick={zoomIn}
                    type="button"
                  >
                    +
                  </button>
                  <button
                    className="gx-btn gx-btn-ghost gx-btn-sm gx-diagram-control gx-diagram-control-wide"
                    onClick={centerView}
                    type="button"
                  >
                    Fit
                  </button>
                  <button
                    className="gx-btn gx-btn-ghost gx-btn-sm gx-diagram-control gx-diagram-control-wide"
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
                    className="gx-btn gx-btn-ghost gx-btn-sm gx-diagram-control gx-diagram-control-wide"
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
            <DiagramView
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
