/**
 * `command-palette` — the Tier 4 command surface: a global shortcut, a
 * non-modal overlay, one focus owner and a filtered list.
 *
 * A palette is not a modal: it owns exactly one focus (its input), the arrow
 * keys move a *visual* selection, and the app-level window handler still sees
 * every key while the field is focused. Those facts decide how a Command
 * palette, an application menu and a search-and-command surface are built, and
 * none of them was measured before this probe. The application-menu half is the
 * same path: `@gpuix/native` 0.10.0 exposes only window controls
 * (`setWindowTitle`, `activateWindow`, `minimizeWindow`, `zoomWindow`,
 * `toggleFullscreen`) and **no native menu API**, so a menu is an in-window
 * surface opened by a window key.
 *
 * The keyboard contract follows the runtime, not the DOM: arrows arrive at the
 * field as key **down** and move the active row there, Enter arrives as
 * `onSubmit` (plan `041`), and Escape is handled on the input's key down.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { useGpuix, useWindowSize } from "@gpuix/react";
import type { EventPayload } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Body, Pressable, Readout } from "../ui.js";
import { nodeFor } from "../a11y.js";
import { useWindowKey } from "../window-key.js";
import type { PlaygroundScenario } from "../types.js";
import {
  filterCommands,
  moveActive,
  type Command,
} from "./command-palette-state.js";

const COMMANDS: ReadonlyArray<Command> = [
  { id: "new-file", label: "New file" },
  { id: "open-settings", label: "Open settings" },
  { id: "toggle-sidebar", label: "Toggle sidebar" },
];

const CommandPaletteProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const window = useWindowSize();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [committed, setCommitted] = useState("none");
  const [last, setLast] = useState("none");
  const [windowLast, setWindowLast] = useState("none");
  const [windowKeys, setWindowKeys] = useState(0);
  const [inputLast, setInputLast] = useState("none");
  // The element that owned focus when the palette opened, captured in the
  // handler — `autoFocus` would already have moved it by the time a layout
  // effect ran.
  const [previousFocus, setPreviousFocus] = useState(Option.none<number>());
  const filtered = filterCommands(COMMANDS, query);
  const activeIndex =
    filtered.length === 0 ? 0 : Math.min(active, filtered.length - 1);

  const openPalette = (reason: string) => {
    setPreviousFocus(Option.fromNullishOr(renderer?.getFocusedElementId?.()));
    setQuery("");
    setActive(0);
    setLast(reason);
    setOpen(true);
  };

  const close = (reason: string) => {
    setOpen(false);
    setLast(reason);
    Option.match(previousFocus, {
      onNone: () => {},
      onSome: (id) => {
        if (renderer?.getElementBounds?.(id) === null) return;
        renderer?.focusElement?.(id);
      },
    });
  };

  const commit = (command: Command) => {
    setCommitted(command.label);
    close(`commit:${command.id}`);
  };

  const move = (delta: number) =>
    setActive(moveActive(activeIndex, delta, filtered.length));

  useWindowKey((event) => {
    setWindowKeys((count) => count + 1);
    setWindowLast(
      Option.getOrElse(Option.fromNullishOr(event.key), () => "none"),
    );
    if (event.key !== "k" || event.modifiers?.cmd !== true) return;
    if (open) {
      // A chord must not reset a query; it only proves the shortcut is live.
      setLast("cmd-k");
      return;
    }
    openPalette("cmd-k");
  });

  const handleKeyDown = (event: EventPayload) => {
    setInputLast(`d:${event.key ?? "none"}`);
    if (event.key === "down") move(1);
    if (event.key === "up") move(-1);
    if (event.key === "escape") close("escape");
  };

  // The measured delivery is key down (the field reports `d:down`, not
  // `u:down`), unlike the OTP cells' key-up contract; this handler records the
  // up half so the smoke report can tell the two apart.
  const handleKeyUp = (event: EventPayload) => {
    setInputLast(`u:${event.key ?? "none"}`);
  };

  return (
    <div
      testId="palette-page"
      style={{
        width: 640,
        height: 400,
        padding: 16,
        backgroundColor: theme.colors.background,
      }}
    >
      <Pressable testId="palette-trigger" onClick={() => openPalette("button")}>
        <Body>open command palette</Body>
      </Pressable>
      <div style={{ marginTop: 8 }}>
        <Readout testId="palette-readout">
          {`open=${open} query=${query === "" ? "-" : query} active=${activeIndex} committed=${committed} last=${last} window=${windowLast} keys=${windowKeys} input=${inputLast}`}
        </Readout>
      </div>
      <div style={{ marginTop: 8 }}>
        <Readout testId="palette-background">workspace canvas</Readout>
      </div>
      {open ? (
        <anchored
          deferred
          position={{ x: 0, y: 0 }}
          priority={1}
          occlude
          style={{ position: "absolute" }}
        >
          <div
            testId="palette-layer"
            style={{
              position: "relative",
              width: window.width,
              height: window.height,
            }}
          >
            <div
              testId="palette-veil"
              onClick={() => close("outside")}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: window.width,
                height: window.height,
                backgroundColor: theme.colors.overlay,
              }}
            />
            <div
              testId="palette-surface"
              role="dialog"
              aria-label="command palette"
              aria-id="palette-surface"
              style={{
                position: "absolute",
                left: 40,
                top: 40,
                width: 420,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: 12,
                backgroundColor: theme.colors.card,
                borderWidth: theme.borderWidth.thin,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
              }}
            >
              <input
                testId="palette-input"
                autoFocus
                aria-label="search commands"
                value={query}
                placeholder="type a command"
                onChange={(event) => {
                  setQuery(event.value ?? "");
                  setActive(0);
                }}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                onSubmit={() => {
                  const command = filtered[activeIndex];
                  if (command !== undefined) commit(command);
                }}
                style={{
                  color: theme.colors.inputForeground,
                  backgroundColor: theme.colors.input,
                  padding: 8,
                }}
              />
              <div
                testId="palette-list"
                role="listbox"
                aria-label="commands"
                style={{ display: "flex", flexDirection: "column", gap: 2 }}
              >
                {filtered.map((command, index) => (
                  <div
                    key={command.id}
                    testId={`palette-item-${command.id}`}
                    role="option"
                    aria-id={`palette-item-${command.id}`}
                    aria-selected={index === activeIndex}
                    onClick={() => commit(command)}
                    style={{
                      padding: 8,
                      cursor: "pointer",
                      backgroundColor:
                        index === activeIndex
                          ? theme.colors.accent
                          : theme.colors.card,
                      color:
                        index === activeIndex
                          ? theme.colors.accentForeground
                          : theme.colors.foreground,
                    }}
                  >
                    <text>{command.label}</text>
                  </div>
                ))}
              </div>
              {filtered.length === 0 ? (
                <Readout testId="palette-empty">No commands</Readout>
              ) : null}
            </div>
          </div>
        </anchored>
      ) : null}
    </div>
  );
};

const focused = (host: Smoke.SmokeHost): string =>
  Option.getOrElse(Option.fromNullishOr(host.focused()), () => "none");

const readout = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(
    Option.fromNullishOr(ctx.host.text("palette-readout")),
    () => "",
  );

/** The accessible node authored as `aria-id={id}`, when the frame has one. */
const aria = (ctx: Smoke.SmokeContext, id: string) =>
  Option.flatMap(Option.fromNullishOr(ctx.host.a11y()), (tree) =>
    nodeFor(tree, id),
  );

export const commandPaletteScenario: PlaygroundScenario = {
  id: "command-palette",
  title: "Command palette: window shortcut, overlay, filter and focus",
  capability: "command",
  view: () => <CommandPaletteProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      ctx.host.click("palette-trigger");
      const opened = yield* ctx.expectSome(
        "palette readout after the trigger click",
        Option.fromNullishOr(readout(ctx)),
      );
      yield* ctx.expectContains(
        "the trigger opened the palette",
        opened,
        "open=true",
      );
      yield* ctx.expectContains(
        "the palette paints its commands",
        ctx.host.paintedText().join("\n"),
        "Open settings",
      );
      yield* ctx.expectEqual(
        "opening the palette focuses its input",
        focused(ctx.host),
        "palette-input",
      );
      yield* ctx.expectEqual(
        "the veil covers the page",
        Option.match(Option.fromNullishOr(ctx.host.bounds("palette-veil")), {
          onNone: () => false,
          onSome: (bounds: Smoke.Bounds) =>
            bounds.width >= 640 && bounds.height >= 400,
        }),
        true,
      );
      yield* ctx.expectEqual(
        "the veil paints the theme's overlay surface",
        Option.match(
          Option.fromNullishOr(ctx.host.paintedStyle("palette-veil")),
          {
            onNone: () => false,
            onSome: (style) => Option.isSome(style.backgroundColor),
          },
        ),
        true,
      );

      ctx.host.key("s");
      ctx.host.key("e");
      ctx.host.key("t");
      const typed = yield* ctx.expectSome(
        "palette readout after typing",
        Option.fromNullishOr(readout(ctx)),
      );
      yield* ctx.expectContains(
        "typing filters the palette",
        typed,
        "query=set",
      );
      yield* ctx.expectContains(
        "the app-level handler sees typing in the field",
        typed,
        "window=t keys=3",
      );
      yield* ctx.expectEqual(
        "the filter leaves exactly the matching command",
        yield* ctx.expectSome(
          "the filter's list is painted",
          Option.fromNullishOr(ctx.host.text("palette-list")),
        ),
        "Open settings",
      );
      yield* ctx.expectEqual(
        "a filtered-out command is not painted",
        ctx.host.paintedText().join("\n").includes("New file"),
        false,
      );

      ctx.host.key("z");
      yield* ctx.expectEqual(
        "an unmatched query paints the empty state",
        yield* ctx.expectSome(
          "the empty state is painted",
          Option.fromNullishOr(ctx.host.text("palette-empty")),
        ),
        "No commands",
      );
      ctx.host.key("enter");
      const empty = yield* ctx.expectSome(
        "palette readout after Enter with no match",
        Option.fromNullishOr(readout(ctx)),
      );
      yield* ctx.expectContains(
        "Enter with no match leaves the palette open",
        empty,
        "open=true",
      );
      yield* ctx.expectContains(
        "Enter with no match commits nothing",
        empty,
        "committed=none",
      );

      ctx.host.key("backspace");
      ctx.host.key("backspace");
      ctx.host.key("backspace");
      ctx.host.key("backspace");
      ctx.host.key("down");
      const down = yield* ctx.expectSome(
        "palette readout after ArrowDown",
        Option.fromNullishOr(readout(ctx)),
      );
      yield* ctx.expectContains(
        "ArrowDown moves the active row",
        down,
        "active=1",
      );
      yield* ctx.expectContains(
        "the arrow is delivered as key down",
        down,
        "input=d:down",
      );
      yield* ctx.expectEqual(
        "the arrows keep focus in the input",
        focused(ctx.host),
        "palette-input",
      );
      ctx.host.key("down");
      ctx.host.key("down");
      const wrapped = yield* ctx.expectSome(
        "palette readout after wrapping",
        Option.fromNullishOr(readout(ctx)),
      );
      yield* ctx.expectContains(
        "ArrowDown wraps to the first row",
        wrapped,
        "active=0",
      );
      ctx.host.key("up");
      const up = yield* ctx.expectSome(
        "palette readout after ArrowUp",
        Option.fromNullishOr(readout(ctx)),
      );
      yield* ctx.expectContains(
        "ArrowUp wraps to the last row",
        up,
        "active=2",
      );

      const surface = yield* ctx.expectSome(
        "the palette surface is in the a11y tree",
        aria(ctx, "palette-surface"),
      );
      yield* ctx.expectEqual(
        "the surface exposes the dialog role",
        Option.getOrElse(surface.role, () => "none"),
        "Dialog",
      );
      const activeOption = yield* ctx.expectSome(
        "the active command is in the a11y tree",
        aria(ctx, "palette-item-toggle-sidebar"),
      );
      yield* ctx.expectEqual(
        "the active command announces its selection",
        Option.getOrElse(activeOption.selected, () => false),
        true,
      );
      const idleOption = yield* ctx.expectSome(
        "an inactive command is in the a11y tree",
        aria(ctx, "palette-item-new-file"),
      );
      yield* ctx.expectEqual(
        "an inactive command is not announced as selected",
        Option.getOrElse(idleOption.selected, () => true),
        false,
      );

      ctx.host.key("enter");
      const committed = yield* ctx.expectSome(
        "palette readout after commit",
        Option.fromNullishOr(readout(ctx)),
      );
      yield* ctx.expectContains(
        "Enter commits the active command",
        committed,
        "committed=Toggle sidebar",
      );
      yield* ctx.expectContains(
        "committing closes the palette",
        committed,
        "open=false",
      );
      yield* ctx.expectContains(
        "the commit reason is recorded",
        committed,
        "last=commit:toggle-sidebar",
      );
      yield* ctx.expectEqual(
        "Enter does not reach the window handler",
        committed.includes("window=enter"),
        false,
      );
      yield* ctx.expectEqual(
        "committing returns focus to the trigger",
        focused(ctx.host),
        "palette-trigger",
      );
      yield* ctx.expectEqual(
        "the closed palette is unmounted",
        Option.isNone(Option.fromNullishOr(ctx.host.text("palette-list"))),
        true,
      );

      ctx.host.key("cmd-k");
      const reopened = yield* ctx.expectSome(
        "palette readout after cmd-k",
        Option.fromNullishOr(readout(ctx)),
      );
      yield* ctx.expectContains(
        "the window shortcut reopens the palette",
        reopened,
        "open=true",
      );
      yield* ctx.expectContains(
        "the shortcut resets the query",
        reopened,
        "query=-",
      );
      yield* ctx.expectContains(
        "the window handler saw the chord",
        reopened,
        "window=k",
      );
      yield* ctx.expectEqual(
        "reopening focuses the input again",
        focused(ctx.host),
        "palette-input",
      );

      ctx.host.key("o");
      ctx.host.key("cmd-k");
      const chord = yield* ctx.expectSome(
        "palette readout after a chord while typing",
        Option.fromNullishOr(readout(ctx)),
      );
      yield* ctx.expectContains(
        "a chord does not type into the field",
        chord,
        "query=o",
      );
      yield* ctx.expectContains(
        "the window handler sees a chord while the field is focused",
        chord,
        "window=k",
      );

      ctx.host.key("escape");
      const escaped = yield* ctx.expectSome(
        "palette readout after Escape",
        Option.fromNullishOr(readout(ctx)),
      );
      yield* ctx.expectContains(
        "Escape closes the palette",
        escaped,
        "open=false",
      );
      yield* ctx.expectContains("Escape is recorded", escaped, "last=escape");
      yield* ctx.expectContains(
        "the app-level handler also saw Escape",
        escaped,
        "window=escape",
      );
      yield* ctx.expectEqual(
        "Escape returns focus to the trigger",
        focused(ctx.host),
        "palette-trigger",
      );

      ctx.host.click("palette-trigger");
      ctx.host.click("palette-veil");
      const outside = yield* ctx.expectSome(
        "palette readout after an outside press",
        Option.fromNullishOr(readout(ctx)),
      );
      yield* ctx.expectContains(
        "an outside press dismisses the palette",
        outside,
        "open=false",
      );
      yield* ctx.expectContains(
        "the outside dismissal is recorded",
        outside,
        "last=outside",
      );
      yield* ctx.expectEqual(
        "the dismissed overlay is unmounted",
        Option.isNone(Option.fromNullishOr(ctx.host.text("palette-veil"))),
        true,
      );

      ctx.host.click("palette-trigger");
      ctx.host.click("palette-item-new-file");
      const row = yield* ctx.expectSome(
        "palette readout after a row click",
        Option.fromNullishOr(readout(ctx)),
      );
      yield* ctx.expectContains(
        "a row click lands above the veil",
        row,
        "committed=New file",
      );
      yield* ctx.expectContains(
        "a row click closes the palette",
        row,
        "open=false",
      );
    }),
};
