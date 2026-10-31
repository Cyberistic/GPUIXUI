/**
 * Capture one block offscreen, for its docs preview and Blocks tile (plan 729).
 *
 *   nub run --filter @gpuixui/blocks capture -- <slug> <out.png>
 *
 * The test renderer paints the real tree at 2× with no OS window, so there is
 * no blur and no traffic lights to capture: the theme's window is opaque here
 * and the materials paint their fallback roles — the honest picture of the
 * block without its window server.
 */
import { createTestRoot } from "@gpuix/react/testing";
import { extendTheme, lightTheme, platformTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { Effect } from "effect";
import type { ComponentType } from "react";
import { Agent } from "./agent/agent.js";
import { CalendarBlock } from "./calendar/calendar.js";
import { Launcher } from "./launcher/launcher.js";
import { MenuBar } from "./menubar/menubar.js";
import { Notes } from "./notes/notes.js";
import { Pipeline } from "./pipeline/pipeline.js";
import { Preferences } from "./preferences/preferences.js";
import { Viewer } from "./viewer/viewer.js";
import { Welcome } from "./welcome/welcome.js";

const blocks: Readonly<Record<string, ComponentType>> = {
  pipeline: Pipeline,
  notes: Notes,
  preferences: Preferences,
  launcher: Launcher,
  menubar: MenuBar,
  agent: Agent,
  calendar: CalendarBlock,
  welcome: Welcome,
  viewer: Viewer,
};

const [slug = "", out = ""] = process.argv.slice(2);
const Block = blocks[slug];

const program =
  Block === undefined || out === ""
    ? Effect.logError(
        `usage: capture <${Object.keys(blocks).join("|")}> <out.png>`,
      ).pipe(Effect.as(2))
    : Effect.sync(() => {
        const theme = extendTheme(platformTheme(lightTheme, "darwin"), {
          window: "opaque",
        });
        const root = createTestRoot({ width: 1100, height: 700 });
        root.render(
          <ThemeProvider theme={theme}>
            <Block />
          </ThemeProvider>,
        );
        root.renderer.flush();
        root.renderer.captureScreenshot(out);
        root.unmount();
        return 0;
      });

process.exitCode = await Effect.runPromise(program);
