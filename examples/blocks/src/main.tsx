/** @jsxImportSource @gpuix/react */
/**
 * Open one block as a real native window.
 *
 *   nub run --filter @gpuixui/blocks dev -- pipeline [--dark]
 *   nub run --filter @gpuixui/blocks dev -- desktop [--aero]
 *
 * The window wears the host's platform style and `nativeWindowOptions`, so on
 * macOS the pipeline opens vibrant, with a transparent titlebar and the
 * traffic lights over its sidebar. One block per process: the runtime paints
 * one window per application (`docs/gpuix-capabilities.md`).
 *
 * `--terminal` paints the block through GPUix's terminal platform instead of a
 * window (`render(<App />, { terminal: true })`), inside kitty or Ghostty:
 *
 *   nub run --filter @gpuixui/blocks dev -- settings --terminal
 *
 * A leading `--` is nub's argument separator, passed through: it is skipped.
 *
 * `--bench` (plan 730) reports the process's resident memory five seconds
 * after the window mounts, as `bench rss=<bytes>`, and exits.
 */
import { render } from "@gpuix/react";
import { nativeWindowOptions } from "@gpuixui/shell";
import {
  currentPlatform,
  darkTheme,
  lightTheme,
  platformTheme,
} from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { MotionProvider } from "@gpuixui/motion/react";
import { Effect } from "effect";
import * as Duration from "effect/Duration";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import type { ComponentType } from "react";
import { DesktopBlock } from "./desktop/desktop.js";
import { Agent } from "./agent/agent.js";
import { Console } from "./console/console.js";
import { TilingDesktop } from "./tiling/tiling.js";
import { MacosDesktop } from "./macos/macos.js";
import { Editor } from "./editor/editor.js";
import { Podcast } from "./podcast/podcast.js";
import { Monitor } from "./monitor/monitor.js";
import { CalendarBlock } from "./calendar/calendar.js";
import { Inbox } from "./inbox/inbox.js";
import { Launcher } from "./launcher/launcher.js";
import { License } from "./license/license.js";
import { MenuBar } from "./menubar/menubar.js";
import { Notes } from "./notes/notes.js";
import { Preferences } from "./preferences/preferences.js";
import { Viewer } from "./viewer/viewer.js";
import { Welcome } from "./welcome/welcome.js";
import { Kanban } from "./kanban/kanban.js";
import { Pipeline } from "./pipeline/pipeline.js";
import { SettingsApp } from "./settings/settings.js";
import { Dashboard } from "./dashboard/dashboard.js";

const [slug = "pipeline", ...flags] = process.argv
  .slice(2)
  .filter((arg) => arg !== "--");

const blocks: Readonly<Record<string, ComponentType>> = {
  pipeline: Pipeline,
  license: License,
  notes: Notes,
  preferences: Preferences,
  launcher: Launcher,
  menubar: MenuBar,
  agent: Agent,
  console: Console,
  tiling: TilingDesktop,
  macos: MacosDesktop,
  editor: Editor,
  podcast: Podcast,
  monitor: Monitor,
  calendar: CalendarBlock,
  welcome: Welcome,
  viewer: Viewer,
  desktop: () => (
    <DesktopBlock
      look={flags.includes("--aero") ? "aero" : "luna"}
      width={1100}
      height={700}
    />
  ),
  inbox: Inbox,
  kanban: Kanban,
  dashboard: Dashboard,
  settings: () => (
    <SettingsApp
      initialLook={flags.includes("--terminal") ? "linux" : "darwin"}
    />
  ),
};

const program = Option.match(R.get(blocks, slug), {
  onNone: () =>
    Effect.logError(
      `no block named "${slug}": ${Object.keys(blocks).join(", ")}`,
    ).pipe(Effect.as(2)),
  onSome: (Block) =>
    Effect.sync(() => {
      const theme = platformTheme(
        flags.includes("--dark") ? darkTheme : lightTheme,
        currentPlatform,
      );
      // TODO: the terminal platform paints on commits, not on the motion clock,
      // so an animation's middle frames never reach the terminal; until it
      // drives frames, a terminal run takes the reduced (instant) motion.
      const terminal = flags.includes("--terminal");
      render(
        <MotionProvider preference={terminal ? "reduced" : "animated"}>
          <ThemeProvider theme={theme}>
            <Block />
          </ThemeProvider>
        </MotionProvider>,
        terminal
          ? { terminal: true }
          : {
              title: slug,
              width: 1100,
              height: 700,
              ...nativeWindowOptions(theme, currentPlatform),
            },
      );
      return 0;
    }).pipe(
      Effect.tap(() =>
        flags.includes("--bench")
          ? Effect.sleep(Duration.seconds(5)).pipe(
              Effect.andThen(
                Effect.sync(() =>
                  process.stdout.write(
                    `bench rss=${process.memoryUsage().rss}\n`,
                  ),
                ),
              ),
              Effect.andThen(Effect.sync(() => process.exit(0))),
            )
          : Effect.void,
      ),
    ),
});

process.exitCode = await Effect.runPromise(program);
