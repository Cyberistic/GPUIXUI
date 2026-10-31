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
import { Effect } from "effect";
import * as Duration from "effect/Duration";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import type { ComponentType } from "react";
import { DesktopBlock } from "./desktop/desktop.js";
import { Agent } from "./agent/agent.js";
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
import { Settings } from "./settings/settings.js";

const [slug = "pipeline", ...flags] = process.argv.slice(2);

const blocks: Readonly<Record<string, ComponentType>> = {
  pipeline: Pipeline,
  license: License,
  notes: Notes,
  preferences: Preferences,
  launcher: Launcher,
  menubar: MenuBar,
  agent: Agent,
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
  settings: () => (
    <Settings
      look="darwin"
      onLookChange={() => undefined}
      dark={false}
      onDarkChange={() => undefined}
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
      render(
        <ThemeProvider theme={theme}>
          <Block />
        </ThemeProvider>,
        {
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
