import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { App } from "../app.js";
import { paletteIds, palettes, type PaletteId } from "../palettes.js";
import { scenarios } from "./index.js";
import {
  SHELL_LIST,
  fillOf,
  focusTo,
  inside,
  navId,
  press,
  revealRow,
  textOf,
} from "./shell-nav.js";
import type { ScenarioBody } from "../types.js";

export const SELECTION_TARGET = "input-edit";

export const TARGET_MARKER = "input-field";

export const TARGET_READOUT = "input-readout";

export const TARGET_PALETTE: PaletteId = "light";

const paletteId = (palette: string): string => `theme-mode-${palette}`;

export const shellSelectionScenario: ScenarioBody = {
  view: () => <App list={scenarios} />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const first = yield* ctx.expectSome(
        "the registry has an entry the app opens on",
        Arr.head(scenarios),
      );
      const target = yield* ctx.expectSome(
        "the entry a press opens is in the registry",
        Arr.findFirst(
          scenarios,
          (scenario) => scenario.id === SELECTION_TARGET,
        ),
      );
      yield* ctx.expectEqual(
        "pressing the entry would change the stage",
        target.id === first.id,
        false,
      );
      yield* ctx.expectEqual(
        "the two palettes paint different pages",
        palettes.dark.colors.background === palettes.light.colors.background,
        false,
      );

      const opened = yield* ctx.expectSome(
        "the shell paints its root",
        fillOf(ctx, "app-shell"),
      );
      yield* ctx.expectEqual(
        "the shell opens on the dark palette",
        opened,
        palettes.dark.colors.background,
      );
      yield* ctx.expectEqual(
        "the header names the scenario the app opens on",
        yield* ctx.expectSome(
          "the header paints its title",
          textOf(ctx, "app-title"),
        ),
        first.title,
      );
      yield* ctx.expectEqual(
        "the open row paints the accent",
        yield* ctx.expectSome(
          "the open row paints a fill",
          fillOf(ctx, navId(first.id)),
        ),
        palettes.dark.colors.accent,
      );
      yield* ctx.expectEqual(
        "an unpressed row paints the page",
        yield* ctx.expectSome(
          "the unpressed row paints a fill",
          fillOf(ctx, navId(target.id)),
        ),
        palettes.dark.colors.background,
      );
      yield* ctx.expectEqual(
        "the stage holds none of the pressed scenario yet",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds(TARGET_MARKER))),
        true,
      );

      const tree = yield* ctx.expectSome(
        "the shell paints an accessibility tree",
        Option.fromNullishOr(ctx.host.a11yTree()),
      );
      const buttons = Arr.getSomes(
        Arr.map(
          Arr.filter(tree.nodes, (node) =>
            Option.contains(node.role, "Button"),
          ),
          (node) => node.label,
        ),
      );
      yield* ctx.expectEqual(
        "every sidebar row publishes the title it paints",
        Arr.length(
          Arr.filter(scenarios, (scenario) =>
            Arr.contains(buttons, scenario.title),
          ),
        ),
        Arr.length(scenarios),
      );
      yield* ctx.expectEqual(
        "the palette switch publishes a name for every button",
        Arr.length(
          Arr.filter(paletteIds, (palette) =>
            Arr.contains(buttons, `${palette} palette`),
          ),
        ),
        Arr.length(paletteIds),
      );

      const listed = yield* ctx.expectSome(
        "the sidebar paints its list",
        Option.fromNullishOr(ctx.host.bounds(SHELL_LIST)),
      );
      const revealed = yield* ctx.expectSome(
        "the entry a press opens is on screen",
        yield* revealRow(ctx, SHELL_LIST, navId(target.id)),
      );
      yield* ctx.expectEqual(
        "the revealed row sits inside the list",
        inside(listed, revealed),
        true,
      );

      press(ctx, navId(target.id));

      yield* ctx.expectEqual(
        "the header names the pressed scenario",
        yield* ctx.expectSome(
          "the header paints its title after the press",
          textOf(ctx, "app-title"),
        ),
        target.title,
      );
      const marker = yield* ctx.expectSome(
        "the pressed scenario's view is mounted",
        Option.fromNullishOr(ctx.host.bounds(TARGET_MARKER)),
      );
      yield* ctx.expectEqual(
        "the mounted view has a box",
        marker.width > 0 && marker.height > 0,
        true,
      );
      yield* ctx.expectEqual(
        "the pressed row paints the accent",
        yield* ctx.expectSome(
          "the pressed row paints a fill",
          fillOf(ctx, navId(target.id)),
        ),
        palettes.dark.colors.accent,
      );
      yield* ctx.expectEqual(
        "the row the app opened on returns to the page",
        yield* ctx.expectSome(
          "the retired row paints a fill",
          fillOf(ctx, navId(first.id)),
        ),
        palettes.dark.colors.background,
      );

      press(ctx, TARGET_MARKER);
      ctx.host.key("g");
      yield* ctx.expectContains(
        "typing reaches the mounted scenario's own readout",
        yield* ctx.expectSome(
          "the mounted scenario paints its readout",
          textOf(ctx, TARGET_READOUT),
        ),
        "value=g",
      );

      press(ctx, paletteId(TARGET_PALETTE));

      yield* ctx.expectEqual(
        "the palette switch repaints the shell's root",
        yield* ctx.expectSome(
          "the shell root paints a fill after the switch",
          fillOf(ctx, "app-shell"),
        ),
        palettes.light.colors.background,
      );
      yield* ctx.expectEqual(
        "the selected row follows the palette",
        yield* ctx.expectSome(
          "the selected row paints a fill after the switch",
          fillOf(ctx, navId(target.id)),
        ),
        palettes.light.colors.accent,
      );

      yield* ctx.expectEqual(
        "the palette press left the focus on that button",
        ctx.host.focused() === paletteId(TARGET_PALETTE),
        true,
      );
      yield* ctx.expectEqual(
        "the Tab walk reaches the row the app has open",
        yield* focusTo(ctx, navId(target.id)),
        true,
      );

      ctx.host.focusNext();
      ctx.host.advance(16);
      yield* ctx.expectEqual(
        "one more Tab leaves the list for the stage",
        ctx.host.focused() === TARGET_MARKER,
        true,
      );
      ctx.host.focusPrevious();
      ctx.host.advance(16);
      yield* ctx.expectEqual(
        "the step back returns to the list's one stop",
        ctx.host.focused() === navId(target.id),
        true,
      );
      ctx.host.focusPrevious();
      ctx.host.advance(16);
      yield* ctx.expectEqual(
        "the open row is the list's only stop",
        ctx.host.focused() === paletteId("high"),
        true,
      );
      ctx.host.focusNext();
      ctx.host.advance(16);

      const targetIndex = yield* ctx.expectSome(
        "the pressed entry sits in the registry",
        Arr.findFirstIndex(scenarios, (scenario) => scenario.id === target.id),
      );
      const following = yield* ctx.expectSome(
        "the registry lists an entry after the pressed one",
        Option.fromNullishOr(scenarios[targetIndex + 1]),
      );

      ctx.host.key("down");
      ctx.host.advance(16);
      yield* ctx.expectEqual(
        "an arrow opens the entry after the open one",
        yield* ctx.expectSome(
          "the header paints its title after the arrow",
          textOf(ctx, "app-title"),
        ),
        following.title,
      );
      yield* ctx.expectEqual(
        "the arrow's row paints the accent",
        yield* ctx.expectSome(
          "the arrow's row paints a fill",
          fillOf(ctx, navId(following.id)),
        ),
        palettes.light.colors.accent,
      );
      yield* ctx.expectEqual(
        "the row the arrow left returns to the page",
        yield* ctx.expectSome(
          "the row the arrow left paints a fill",
          fillOf(ctx, navId(target.id)),
        ),
        palettes.light.colors.background,
      );
      yield* ctx.expectEqual(
        "the native focus follows the cursor",
        ctx.host.focused() === navId(following.id),
        true,
      );
      yield* ctx.expectEqual(
        "the entry the cursor left is unmounted",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds(TARGET_MARKER))),
        true,
      );

      ctx.host.key("up");
      ctx.host.advance(16);
      yield* ctx.expectEqual(
        "an arrow back opens the entry it came from",
        yield* ctx.expectSome(
          "the header paints its title after the arrow back",
          textOf(ctx, "app-title"),
        ),
        target.title,
      );

      const listBox = yield* ctx.expectSome(
        "the sidebar paints its scroller",
        Option.fromNullishOr(ctx.host.bounds(SHELL_LIST)),
      );
      const last = yield* ctx.expectSome(
        "the registry has a last entry",
        Arr.last(scenarios),
      );
      const lastBefore = yield* ctx.expectSome(
        "the last row is painted off screen",
        Option.fromNullishOr(ctx.host.bounds(navId(last.id))),
      );
      yield* ctx.expectEqual(
        "the last row starts outside the list",
        inside(listBox, lastBefore),
        false,
      );

      ctx.host.key("end");
      ctx.host.advance(16);
      const lastAfter = yield* ctx.expectSome(
        "the last row is painted after End",
        Option.fromNullishOr(ctx.host.bounds(navId(last.id))),
      );
      yield* ctx.expectEqual(
        "End opens the last entry",
        yield* ctx.expectSome(
          "the header paints the last title",
          textOf(ctx, "app-title"),
        ),
        last.title,
      );
      yield* ctx.expectEqual(
        "End reveals the row it opened",
        inside(listBox, lastAfter),
        true,
      );

      ctx.host.key("home");
      ctx.host.advance(16);
      const firstAfter = yield* ctx.expectSome(
        "the first row is painted after Home",
        Option.fromNullishOr(ctx.host.bounds(navId(first.id))),
      );
      yield* ctx.expectEqual(
        "Home opens the first entry",
        yield* ctx.expectSome(
          "the header paints the first title",
          textOf(ctx, "app-title"),
        ),
        first.title,
      );
      yield* ctx.expectEqual(
        "Home reveals the row it opened",
        inside(listBox, firstAfter),
        true,
      );

      ctx.host.key("up");
      ctx.host.advance(16);
      yield* ctx.expectEqual(
        "an arrow up at the first row keeps it",
        yield* ctx.expectSome(
          "the header still paints the first title",
          textOf(ctx, "app-title"),
        ),
        first.title,
      );
      yield* ctx.expectEqual(
        "the focus stays on the clamped row",
        ctx.host.focused() === navId(first.id),
        true,
      );

      yield* ctx.expectEqual(
        "the walk back reaches the palette",
        yield* focusTo(ctx, paletteId("dark"), 10, true),
        true,
      );
      ctx.host.key("enter");
      ctx.host.advance(16);
      yield* ctx.expectEqual(
        "Enter switches the palette it landed on",
        yield* ctx.expectSome(
          "the shell root paints a fill after Enter",
          fillOf(ctx, "app-shell"),
        ),
        palettes.dark.colors.background,
      );
      yield* ctx.expectEqual(
        "the selected row follows the palette back",
        yield* ctx.expectSome(
          "the selected row paints a fill after Enter",
          fillOf(ctx, navId(first.id)),
        ),
        palettes.dark.colors.accent,
      );

      ctx.host.focusNext();
      ctx.host.advance(16);
      yield* ctx.expectEqual(
        "the walk on from dark reaches the light palette",
        ctx.host.focused() === paletteId(TARGET_PALETTE),
        true,
      );
      ctx.host.key("space");
      ctx.host.advance(16);
      yield* ctx.expectEqual(
        "Space switches the palette it landed on",
        yield* ctx.expectSome(
          "the shell root paints a fill after Space",
          fillOf(ctx, "app-shell"),
        ),
        palettes.light.colors.background,
      );
      yield* ctx.expectEqual(
        "the selected row follows the palette after Space",
        yield* ctx.expectSome(
          "the selected row paints a fill after Space",
          fillOf(ctx, navId(first.id)),
        ),
        palettes.light.colors.accent,
      );
    }),
};
