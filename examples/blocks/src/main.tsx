/**
 * Open one block as a real native window.
 *
 *   nub run --filter @gpuixui/blocks dev -- pipeline [--dark]
 *
 * The window wears the host's platform style and `nativeWindowOptions`, so on
 * macOS the pipeline opens vibrant, with a transparent titlebar and the
 * traffic lights over its sidebar. One block per process: the runtime paints
 * one window per application (`docs/gpuix-capabilities.md`).
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
import * as Option from "effect/Option";
import * as R from "effect/Record";
import type { ComponentType } from "react";
import { Inbox } from "./inbox/inbox.js";
import { Kanban } from "./kanban/kanban.js";
import { Pipeline } from "./pipeline/pipeline.js";
import { Settings } from "./settings/settings.js";

const blocks: Readonly<Record<string, ComponentType>> = {
  pipeline: Pipeline,
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

const [slug = "pipeline", ...flags] = process.argv.slice(2);

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
    }),
});

process.exitCode = await Effect.runPromise(program);
