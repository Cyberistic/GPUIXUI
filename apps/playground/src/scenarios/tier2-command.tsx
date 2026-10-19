/**
 * `tier2-command` — the shipped `CommandMenu` from `@gpuixui/components`,
 * mounted by a consumer and driven natively.
 *
 * `command-palette` (plan `176`) measured the contract on a local palette.
 * This scenario proves the **shipped** compound parts on the consumer path:
 * the modal surface, the input that keeps focus, the highlighted (not focused)
 * row, ranked filtering, the empty state and Enter/Escape. It also records two
 * measured limits of the component on 0.10.0: closing leaves no focus owner,
 * and Home/End never reach the palette (the native editor consumes them).
 * Plan `581`.
 *
 * The `open` flag is consumer state because the component is controlled — the
 * same shape the package's own example uses.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { useWindowSize } from "@gpuix/react";
// Compiled by `tsconfig.vendor.json`; see the note in `tier2-dialog.tsx`.
import {
  CommandMenu,
  CommandMenuEmpty,
  CommandMenuInput,
  CommandMenuList,
} from "../../vendor/packages/components/src/index.js";
import { Button } from "../../vendor/packages/components/src/internal/button.js";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import { focusedId, painted, read, styleOf } from "./probes.js";

/** The consumer's callback, so the scenario proves `perform` reached it. */
interface Actions {
  readonly onRun: (label: string) => void;
}

/** The palette: three groups, one disabled row and display-only shortcuts. */
const Palette = ({ onRun }: Actions) => {
  const theme = useTheme();
  const window = useWindowSize();
  const [open, setOpen] = useState(false);
  const [ran, setRan] = useState("none");

  const perform =
    (label: string): (() => void) =>
    () => {
      setRan(label);
      onRun(label);
    };

  return (
    <div
      testId="tier2-command-frame"
      style={{
        width: window.width,
        height: window.height,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      <Button testId="command-open" onClick={() => setOpen(true)}>
        Open command menu
      </Button>
      <Readout testId="tier2-command-readout">
        {`open=${open} ran=${ran}`}
      </Readout>
      <Readout testId="tier2-command-accent">{theme.colors.accent}</Readout>
      <CommandMenu
        open={open}
        onOpenChange={setOpen}
        actions={[
          {
            id: "go-components",
            label: "Go to Components",
            group: "Navigation",
            shortcut: "⌘1",
            perform: perform("Go to Components"),
          },
          {
            id: "go-tokens",
            label: "Go to Tokens",
            group: "Navigation",
            shortcut: "⌘2",
            perform: perform("Go to Tokens"),
          },
          {
            id: "new-file",
            label: "New file",
            group: "File",
            shortcut: "⌘N",
            perform: perform("New file"),
          },
          {
            id: "save",
            label: "Save",
            group: "File",
            shortcut: "⌘S",
            perform: perform("Save"),
          },
          {
            id: "toggle-sidebar",
            label: "Toggle sidebar",
            group: "View",
            perform: perform("Toggle sidebar"),
          },
          {
            id: "reset-zoom",
            label: "Reset zoom",
            group: "View",
            disabled: true,
            perform: perform("Reset zoom"),
          },
        ]}
      >
        <CommandMenuInput />
        <CommandMenuList />
        <CommandMenuEmpty>No commands</CommandMenuEmpty>
      </CommandMenu>
    </div>
  );
};

/** The row's leading bar is the highlight: `accent` when active, `popover` otherwise. */
const isHighlighted = (
  ctx: Smoke.SmokeContext,
  accent: string,
  testId: string,
): boolean =>
  Option.exists(styleOf(ctx, testId), (style) =>
    Option.exists(style.borderColor, (colour) => colour === accent),
  );

export const tier2CommandScenario: PlaygroundScenario = {
  id: "tier2-command",
  title: "Tier 2 Command menu: filter, highlight, run, Escape and focus",
  capability: "tier2",
  view: () => <Palette onRun={() => undefined} />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectSome(
        "the consumer frame paints",
        painted(ctx, "tier2-command-frame"),
      );
      const accent = read(ctx, "tier2-command-accent");

      yield* ctx.expectContains(
        "the palette starts closed",
        read(ctx, "tier2-command-readout"),
        "open=false",
      );
      yield* ctx.expectEqual(
        "a closed palette paints no surface",
        Option.isNone(painted(ctx, "command-menu")),
        true,
      );

      // 1. The consumer's control opens it; the input owns native focus.
      // A native click on a `div` does not make it the focus owner in this
      // harness, so the trigger is focused then activated from the keyboard —
      // the shipped Button's Enter contract.
      ctx.host.focusNext();
      yield* ctx.expectEqual(
        "the trigger can be the focus owner",
        focusedId(ctx),
        "command-open",
      );
      ctx.host.key("enter");
      yield* ctx.expectSome(
        "the dialog surface paints",
        painted(ctx, "command-menu"),
      );
      yield* ctx.expectContains(
        "the consumer sees the open state",
        read(ctx, "tier2-command-readout"),
        "open=true",
      );
      yield* ctx.expectEqual(
        "the search input takes native focus",
        focusedId(ctx),
        "command-input",
      );

      // 2. Every group and action paints; the first enabled row is highlighted.
      const labels = ctx.host.paintedText().join("\n");
      yield* ctx.expectContains(
        "the Navigation group paints",
        labels,
        "Navigation",
      );
      yield* ctx.expectContains("the File group paints", labels, "File");
      yield* ctx.expectContains("the View group paints", labels, "View");
      yield* ctx.expectContains(
        "an action outside the first group paints",
        labels,
        "Toggle sidebar",
      );
      yield* ctx.expectContains(
        "the disabled action still paints",
        labels,
        "Reset zoom",
      );
      // `paintedStyle` is decoded from the runtime's own report.
      yield* ctx.expectEqual(
        "the first enabled row is highlighted",
        isHighlighted(ctx, accent, "command-go-components"),
        true,
      );
      yield* ctx.expectEqual(
        "the disabled row is not highlighted",
        isHighlighted(ctx, accent, "command-reset-zoom"),
        false,
      );

      // 3. Arrows move the highlight and never the focus.
      ctx.host.key("down");
      yield* ctx.expectEqual(
        "Down moves the highlight to the next enabled row",
        isHighlighted(ctx, accent, "command-go-tokens"),
        true,
      );
      yield* ctx.expectEqual(
        "the earlier row is no longer highlighted",
        isHighlighted(ctx, accent, "command-go-components"),
        false,
      );
      yield* ctx.expectEqual(
        "the input keeps native focus while the highlight moves",
        focusedId(ctx),
        "command-input",
      );
      ctx.host.key("up");
      yield* ctx.expectEqual(
        "Up returns the highlight",
        isHighlighted(ctx, accent, "command-go-components"),
        true,
      );
      // Home/End are consumed by the native editor before React's `onKeyDown`
      // (the same rule plan `533` measured for `cmd-a`), so the palette's
      // first/last branches never run on 0.10.0. Measured here, not assumed.
      ctx.host.key("end");
      yield* ctx.expectEqual(
        "End stays in the editor and leaves the highlight",
        isHighlighted(ctx, accent, "command-go-components"),
        true,
      );
      ctx.host.key("home");
      yield* ctx.expectEqual(
        "Home stays in the editor and leaves the highlight",
        isHighlighted(ctx, accent, "command-go-components"),
        true,
      );

      // 4. Typing filters through the native editor.
      ctx.host.key("s a v e");
      yield* ctx.expectSome(
        "the matching action survives the query",
        painted(ctx, "command-save"),
      );
      yield* ctx.expectEqual(
        "a non-matching action leaves the list",
        Option.isNone(painted(ctx, "command-toggle-sidebar")),
        true,
      );
      yield* ctx.expectEqual(
        "the filtered list keeps focus in the input",
        focusedId(ctx),
        "command-input",
      );

      // 5. Enter runs the highlighted match once and closes.
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "Enter ran the matching action",
        read(ctx, "tier2-command-readout"),
        "ran=Save",
      );
      yield* ctx.expectContains(
        "Enter closed the palette",
        read(ctx, "tier2-command-readout"),
        "open=false",
      );
      yield* ctx.expectEqual(
        "the dialog left the tree",
        Option.isNone(painted(ctx, "command-menu")),
        true,
      );
      // Measured on 0.10.0: closing leaves **no** focus owner instead of
      // returning it to the opener. `CommandMenuInput`'s `autoFocus` takes focus
      // in the same commit, before the dialog's `useModalFocus` records the
      // previous owner, so the saved id is the input being destroyed. Recorded
      // as a cross-team defect in `TODO.md`; the live twin asserts the same
      // measured outcome.
      yield* ctx.expectEqual(
        "closing leaves no focus owner on this runtime (measured defect)",
        focusedId(ctx),
        "none",
      );

      // 6. Escape closes without running anything.
      ctx.host.click("command-open");
      yield* ctx.expectSome(
        "the reopened dialog paints",
        painted(ctx, "command-menu"),
      );
      ctx.host.key("escape");
      yield* ctx.expectContains(
        "Escape closed the palette",
        read(ctx, "tier2-command-readout"),
        "open=false",
      );
      yield* ctx.expectContains(
        "Escape ran nothing",
        read(ctx, "tier2-command-readout"),
        "ran=Save",
      );

      // 7. Reopening starts with an empty query: the closing clears it.
      ctx.host.click("command-open");
      yield* ctx.expectSome(
        "reopening paints the full list",
        painted(ctx, "command-reset-zoom"),
      );

      // 8. No match paints the empty state; Enter runs nothing.
      ctx.host.key("z z z");
      yield* ctx.expectContains(
        "an unmatched query paints the empty state",
        read(ctx, "command-empty"),
        "No commands",
      );
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "Enter on an empty list runs nothing",
        read(ctx, "tier2-command-readout"),
        "ran=Save",
      );

      // 9. A display-only shortcut is inert: the component binds no keys.
      ctx.host.key("escape");
      ctx.host.click("command-open");
      ctx.host.key("cmd-s");
      yield* ctx.expectContains(
        "cmd-s does not run a command",
        read(ctx, "tier2-command-readout"),
        "ran=Save",
      );
      yield* ctx.expectContains(
        "cmd-s does not close the palette",
        read(ctx, "tier2-command-readout"),
        "open=true",
      );
    }),
};
