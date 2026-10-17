/**
 * `window-key-shortcut` — an app-level shortcut (the command-palette mechanism).
 *
 * GPUix delivers window keys only through the app boundary (`render({ onKeyDown })`),
 * after the focused element's `onKeyDown`. That is how a command palette or an
 * application menu gets a global shortcut, and it is the one input path the
 * element-level scenarios do not cover. Measured on this host (plan `140` §4):
 * `simulateKeystrokes("cmd-k")` runs the element handler and then the window
 * handler, with `event.modifiers.cmd` set.
 */
import { useState } from "react";
import { Effect, pipe } from "effect";
import * as Option from "effect/Option";
import type { Smoke } from "@gpuixui/testing";
import { theme } from "../theme.js";
import { Readout } from "../ui.js";
import { useWindowKey } from "../window-key.js";
import type { PlaygroundScenario } from "../types.js";

const ShortcutProbe = () => {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState("none");

  useWindowKey((event) => {
    if (event.key === "k" && event.modifiers?.cmd) {
      setOpen((current) => !current);
      setLast("cmd-k");
    }
    if (event.key === "escape") {
      setOpen(false);
      setLast("escape");
    }
  });

  return (
    <div
      tabIndex={0}
      autoFocus
      style={{
        width: 420,
        height: 240,
        padding: 12,
        backgroundColor: theme.surface,
      }}
    >
      <text testId="shortcut-hint" style={{ color: theme.muted, fontSize: 12 }}>
        press cmd-k for the palette, escape to close
      </text>
      <div style={{ marginTop: 8 }}>
        <Readout testId="shortcut-readout">{`open=${open} last=${last}`}</Readout>
      </div>
      {open ? (
        <div
          testId="shortcut-palette"
          style={{
            marginTop: 8,
            padding: 8,
            backgroundColor: theme.panel,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <text style={{ color: theme.text }}>command palette</text>
        </div>
      ) : null}
    </div>
  );
};

/** The `open=`/`last=` readout, or `""` when the element is missing. */
const readout = (ctx: Smoke.SmokeContext): string =>
  pipe(
    Option.fromNullishOr(ctx.host.text("shortcut-readout")),
    Option.getOrElse(() => ""),
  );

export const shortcutScenario: PlaygroundScenario = {
  id: "window-key-shortcut",
  title: "App-level window shortcut: cmd-k palette and Escape",
  capability: "workspace",
  view: () => <ShortcutProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectContains(
        "palette starts closed",
        readout(ctx),
        "open=false",
      );

      ctx.host.key("cmd-k");
      yield* ctx.expectContains(
        "cmd-k reached the window handler and opened the palette",
        readout(ctx),
        "open=true last=cmd-k",
      );
      yield* ctx.expectContains(
        "palette painted",
        ctx.host.paintedText().join("\n"),
        "command palette",
      );

      ctx.host.key("escape");
      yield* ctx.expectContains(
        "Escape closed the palette",
        readout(ctx),
        "open=false last=escape",
      );
    }),
};
