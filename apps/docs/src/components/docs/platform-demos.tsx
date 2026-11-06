import { WindowFrame } from "./window-frame";

export const WindowDemo = () => (
  <div className="gx-demo gx-platform-scene">
    <WindowFrame
      title="Inbox"
      height={300}
      sidebar={
        <>
          {["Inbox", "Drafts", "Sent"].map((item, index) => (
            <span
              className="gx-window-row"
              data-selected={index === 0 ? "" : undefined}
              key={item}
            >
              {item}
            </span>
          ))}
          <span className="gx-window-section">Folders</span>
          <span className="gx-window-row">Archive</span>
        </>
      }
    />
    <p className="gx-platform-caption">
      The sidebar runs under the lights and shows the desktop through it; the
      content stays opaque.
    </p>
  </div>
);

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

export const windowDemoSource = `import {
  nativeWindowOptions,
  SourceList,
  Window,
  WindowToolbar,
} from "@gpuixui/shell";
import { currentPlatform, lightTheme, platformTheme } from "@gpuixui/tokens";

const theme = platformTheme(lightTheme, currentPlatform);

const Mail = () => {
  const [place, setPlace] = useState("inbox");
  return (
    <Window
      sidebar={
        <SourceList
          label="Mailboxes"
          value={place}
          onValueChange={setPlace}
          sections={[
            { id: "mail", items: [
              { id: "inbox", label: "Inbox", icon: "mail", count: 12 },
              { id: "drafts", label: "Drafts", icon: "file" },
            ] },
            { id: "folders", title: "Folders", items: [
              { id: "archive", label: "Archive", icon: "folder" },
            ] },
          ]}
        />
      }
      toolbar={<WindowToolbar title="Inbox" />}
    >
      {/* … */}
    </Window>
  );
};

// A transparent titlebar, the theme's vibrant window and the lights on the
// toolbar's line — nothing on Windows or Linux, which keep the system bar.
render(<ThemeProvider theme={theme}><Mail /></ThemeProvider>, {
  title: "Mail",
  width: 900,
  height: 600,
  ...nativeWindowOptions(theme, currentPlatform),
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
