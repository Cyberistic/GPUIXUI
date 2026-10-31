/**
 * Capture one block offscreen, for its docs preview and Blocks tile (plan 729).
 *
 *   nub run --filter @gpuixui/blocks capture -- <slug> <out.png> [win32|linux] [--dark]
 *
 * The test renderer paints the real tree at 2× with no OS window, so there is
 * no blur and no traffic lights to capture: the theme's window is opaque here
 * and the materials paint their fallback roles — the honest picture of the
 * block without its window server.
 */
import { createTestRoot } from "@gpuix/react/testing";
import {
  darkTheme,
  extendTheme,
  isPlatformName,
  lightTheme,
  platformTheme,
} from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { Effect } from "effect";
import type { PlatformName } from "@gpuixui/tokens";
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

const blocks: Readonly<
  Record<string, ComponentType<{ readonly platform?: PlatformName }>>
> = {
  pipeline: Pipeline,
  notes: Notes,
  preferences: Preferences,
  launcher: () => <Launcher />,
  menubar: () => <MenuBar />,
  agent: Agent,
  calendar: CalendarBlock,
  welcome: Welcome,
  viewer: Viewer,
};

const [slug = "", out = "", ...flags] = process.argv.slice(2);
const platform = flags.find(isPlatformName) ?? "darwin";
const base = flags.includes("--dark") ? darkTheme : lightTheme;
const Block = blocks[slug];

const program =
  Block === undefined || out === ""
    ? Effect.logError(
        `usage: capture <${Object.keys(blocks).join("|")}> <out.png>`,
      ).pipe(Effect.as(2))
    : Effect.sync(() => {
        const theme = extendTheme(platformTheme(base, platform), {
          window: "opaque",
        });
        const root = createTestRoot({ width: 1100, height: 700 });
        root.render(
          <ThemeProvider theme={theme}>
            <Block platform={platform} />
          </ThemeProvider>,
        );
        root.renderer.flush();
        // A measured reveal (a Disclosure's body) lays out on the paint after
        // its first: deliver the layout events, run every tween, paint again.
        for (const _ of [0, 1, 2]) {
          root.renderer.dispatchNativeEvents();
          root.renderer.clockFastForward(1_000);
          root.renderer.flush();
        }
        root.renderer.captureScreenshot(out);
        root.unmount();
        return 0;
      });

process.exitCode = await Effect.runPromise(program);
