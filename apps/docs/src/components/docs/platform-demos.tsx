/**
 * Browser drawings for the platform section.
 *
 * The native surface is the OS's: a titlebar the app paints under the traffic
 * lights, and the system's own path panel. A browser cannot mount either, so
 * these mirror the shipped geometry — the 78-point inset, the 38-point bar and
 * the panel's sidebar/list split — and read the preview surface's theme roles.
 */

/** The window's top row, with its traffic lights, over a themed app bar. */
export const TitleBarDemo = () => (
  <div className="gx-demo gx-platform-scene">
    <div className="gx-platform-window">
      <div className="gx-platform-lights" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="gx-platform-bar">
        <span className="gx-platform-title">Files</span>
        <span className="gx-platform-actions">
          <span className="gx-platform-action" />
          <span className="gx-platform-action" />
        </span>
      </div>
      <div className="gx-platform-body">
        <span className="gx-platform-line" />
        <span className="gx-platform-line gx-platform-line-short" />
      </div>
    </div>
    <p className="gx-platform-caption">
      The lights float over the app&apos;s own bar; the bar reserves their box.
    </p>
  </div>
);

/** The system's path panel, with its source list and file table. */
export const FilePanelDemo = () => (
  <div className="gx-demo gx-platform-scene">
    <div className="gx-platform-panel">
      <div className="gx-platform-panel-side">
        {["Recents", "Desktop", "Documents", "Downloads"].map((item, index) => (
          <span
            className="gx-platform-panel-side-item"
            data-current={index === 2 ? "" : undefined}
            key={item}
          >
            {item}
          </span>
        ))}
      </div>
      <div className="gx-platform-panel-main">
        <span className="gx-platform-panel-title">Open</span>
        <div className="gx-platform-panel-rows">
          {["Design system.fig", "Launch film.mp4", "Tokens.json"].map(
            (file, index) => (
              <span
                className="gx-platform-panel-row"
                data-current={index === 0 ? "" : undefined}
                key={file}
              >
                {file}
              </span>
            ),
          )}
        </div>
        <div className="gx-platform-panel-foot">
          <span className="gx-platform-panel-button">Cancel</span>
          <span className="gx-platform-panel-button" data-primary="">
            Open
          </span>
        </div>
      </div>
    </div>
    <p className="gx-platform-caption">
      A cancel answers <code>Cancelled</code>, not an empty list.
    </p>
  </div>
);

export const titleBarDemoSource = `import { TitleBar, useWindowActions } from "@gpuixui/shell";

const Window = () => {
  const window = useWindowActions();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TitleBar
        actions={
          <Button size="sm" variant="ghost" onClick={window.minimize}>
            Minimise
          </Button>
        }
        title="Files"
      />
      {/* … */}
    </div>
  );
};

// The window opens with its own bar under the lights:
render(<Window />, {
  title: "Files",
  titlebarTransparent: true,
  trafficLightX: 20,
  trafficLightY: 14,
  width: 900,
  height: 600,
});`;

export const windowActionsSource = `import { useWindowActions } from "@gpuixui/shell";
import { Effect } from "effect";

const window = useWindowActions();

window.minimize();
window.zoom();
window.toggleFullscreen();
window.setTitle("Files");

// The system's picker: a cancel is Cancelled, not an empty list.
const chosen = await Effect.runPromise(
  window.pickPaths({ directories: true, prompt: "Choose a folder" }),
);

if (chosen._tag === "Picked") console.log(chosen.paths);`;
