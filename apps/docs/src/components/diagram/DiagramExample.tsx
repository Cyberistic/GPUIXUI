import { DiagramView } from "./DiagramView";
import { ZoomPan } from "./ZoomPan";

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

export function DiagramExample() {
  return (
    <div className="gx-diagram-example not-prose">
      <ZoomPan
        className="gx-diagram-canvas"
        fitOn="example"
        controls={({
          zoomIn,
          zoomOut,
          resetZoom,
          centerView,
          scalePercent,
        }) => (
          <div className="gx-diagram-preview-bar">
            <span className="gx-diagram-preview-label">Diagram</span>
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
            </div>
          </div>
        )}
      >
        <DiagramView chart={PIPELINE} config={{ theme: "ocean" }} />
      </ZoomPan>
    </div>
  );
}

export const mermaidExampleSource = `import { DiagramView } from "@/components/diagram/Mermaid";
import { ZoomPan } from "@/components/diagram/ZoomPan";

<ZoomPan
  controls={({ zoomIn, zoomOut, resetZoom, centerView, scalePercent }) => (
    <>…</>
  )}
>
  <DiagramView chart={source} config={{ theme: "ocean" }} />
</ZoomPan>;`;
