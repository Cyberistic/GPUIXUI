import { Mermaid } from "./Mermaid";
import { ZoomPan } from "./ZoomPan";

/**
 * One diagram in the docs: a Pele render inside the zoom/pan canvas, with the
 * four controls mermaidcn's preview exposes.
 *
 * The source is deliberately a graph with two paths and a cycle, so zooming and
 * panning have something to reveal beyond the initial fit.
 */

const PIPELINE = `flowchart LR
  subgraph author[Author]
    component[Component] --> recipe[Recipe]
  end
  subgraph render[Render]
    recipe --> themed[Themed surface]
    themed --> frame[Frame]
  end
  subgraph reader[Reader]
    frame --> pointer[Pointer]
    frame --> key[Keyboard]
  end
  author --> render
  render --> reader`;

export function MermaidExample() {
  return (
    <div className="gx-mermaidcn-example not-prose">
      <ZoomPan
        className="gx-mermaidcn-canvas"
        fitOn="example"
        controls={({
          zoomIn,
          zoomOut,
          resetZoom,
          centerView,
          scalePercent,
        }) => (
          <div className="gx-mermaidcn-preview-bar">
            <span className="gx-mermaidcn-preview-label">Diagram</span>
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
            </div>
          </div>
        )}
      >
        <Mermaid chart={PIPELINE} config={{ theme: "ocean" }} />
      </ZoomPan>
    </div>
  );
}

export const mermaidExampleSource = `import { Mermaid } from "@/components/mermaidcn/Mermaid";
import { ZoomPan } from "@/components/mermaidcn/ZoomPan";

<ZoomPan
  controls={({ zoomIn, zoomOut, resetZoom, centerView, scalePercent }) => (
    <>…</>
  )}
>
  <Mermaid chart={source} config={{ theme: "ocean" }} />
</ZoomPan>;`;
