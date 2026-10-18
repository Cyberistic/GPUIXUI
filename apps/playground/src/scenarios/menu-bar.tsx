/**
 * `menu-bar` — the in-window application menu bar (plan `519`).
 *
 * 0.10.0 exposes no OS menu/tray API, so a menu bar is an in-window surface.
 * What was measured before is the palette (`command-palette`) and the
 * dropdown/context surfaces; a menu bar's own model was not:
 *
 * - one menu open at a time, switched by hover or Left/Right **without a press**;
 * - Up/Down rove the rows, wrap, and skip disabled rows;
 * - Escape and activation return native focus to the **open title**;
 * - an accelerator runs exactly once, never opens a menu, and is inert for a
 *   disabled row;
 * - `menubar`/`menu`/`menuitem` and `aria-expanded` in the accessibility tree.
 *
 * The surface itself is the measured `FloatingLayer` (`side="bottom"`,
 * `align="start"`); the probe re-asserts the bar-relative box so a broken mount
 * is not blamed on the model.
 */
import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Effect, Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useGpuix } from "@gpuix/react";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import { FloatingLayer } from "@gpuix/react/floating";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import { useWindowKey } from "../window-key.js";
import type { PlaygroundScenario } from "../types.js";
import type { Menu, MenuItem, MenubarState } from "./menubar-model.js";
import {
  acceleratorCommand,
  chordOf,
  closeMenu,
  enterMenu,
  hoverTitle,
  initial,
  pressTitle,
  stepItem,
  stepTitle,
} from "./menubar-model.js";

const BAR_HEIGHT = 28;
const TITLE_HEIGHT = 24;
const ITEM_HEIGHT = 32;
const MENU_WIDTH = 180;

const MENUS: ReadonlyArray<Menu> = [
  {
    id: "file",
    label: "File",
    disabled: false,
    items: [
      {
        id: "new",
        label: "New",
        accelerator: Option.some("cmd-n"),
        disabled: false,
      },
      {
        id: "open",
        label: "Open…",
        accelerator: Option.some("cmd-o"),
        disabled: false,
      },
      {
        id: "save",
        label: "Save",
        accelerator: Option.some("cmd-s"),
        disabled: false,
      },
      {
        id: "save-as",
        label: "Save As…",
        accelerator: Option.some("cmd-shift-s"),
        disabled: true,
      },
    ],
  },
  {
    id: "edit",
    label: "Edit",
    disabled: false,
    items: [
      {
        id: "undo",
        label: "Undo",
        accelerator: Option.some("cmd-z"),
        disabled: false,
      },
      {
        id: "redo",
        label: "Redo",
        accelerator: Option.some("cmd-shift-z"),
        disabled: true,
      },
    ],
  },
  {
    id: "view",
    label: "View",
    disabled: true,
    items: [
      { id: "zoom", label: "Zoom", accelerator: Option.none(), disabled: true },
    ],
  },
  {
    id: "help",
    label: "Help",
    disabled: false,
    items: [
      {
        id: "about",
        label: "About",
        accelerator: Option.none(),
        disabled: false,
      },
    ],
  },
];

const titleId = (menu: Menu): string => `menubar-${menu.id}`;
const surfaceId = (menu: Menu): string => `menubar-${menu.id}-surface`;
const itemId = (menu: Menu, item: MenuItem): string =>
  `menu-${menu.id}-${item.id}`;

/** The `testId` a state's open menu wants native focus on. */
const focusTarget = (state: MenubarState): string =>
  Option.match(
    Option.flatMap(state.open, (index) => Arr.get(MENUS, index)),
    {
      onNone: () =>
        Option.getOrElse(
          Option.map(Arr.get(MENUS, state.active), titleId),
          () => "menubar-file",
        ),
      onSome: (menu) =>
        Option.match(Arr.get(menu.items, state.item), {
          onNone: () => titleId(menu),
          onSome: (item) => itemId(menu, item),
        }),
    },
  );

const MenuBarProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const targets = useRef<Record<string, PublicInstance | null>>({});
  const [state, setState] = useState<MenubarState>(initial);
  const [runs, setRuns] = useState(0);
  const [last, setLast] = useState("none");
  const [outside, setOutside] = useState(0);
  const [want, setWant] = useState({ target: "none" });

  const capture =
    (target: string) =>
    (instance: PublicInstance | null): void => {
      targets.current[target] = instance;
    };

  useLayoutEffect(() => {
    const instance = targets.current[want.target];
    if (instance) renderer?.focusElement?.(instance.id);
  }, [want, renderer]);

  const apply = (next: MenubarState): void => {
    setState(next);
    setWant({ target: focusTarget(next) });
  };

  const press = (index: number): void => {
    const next = pressTitle(state, MENUS, index);
    if (next !== state) apply(next);
  };

  const hover = (index: number): void => {
    const next = hoverTitle(state, MENUS, index);
    if (next !== state) apply(next);
  };

  const moveTitle = (delta: number): void => {
    const next = stepTitle(state, MENUS, delta);
    if (next !== state) apply(next);
  };

  const moveItem = (delta: number): void => {
    const next = stepItem(state, MENUS, delta);
    if (next !== state) apply(next);
  };

  const openActive = (): void => {
    const next = enterMenu(state, MENUS);
    if (next !== state) apply(next);
  };

  const close = (): void => {
    if (Option.isSome(state.open)) apply(closeMenu(state));
  };

  const run = (item: MenuItem): void => {
    if (item.disabled) return;
    setRuns((count) => count + 1);
    setLast(item.id);
    apply(closeMenu(state));
  };

  const onBarKeyDown = (event: EventPayload): void => {
    Match.value(event.key).pipe(
      Match.when("right", () => moveTitle(1)),
      Match.when("left", () => moveTitle(-1)),
      Match.when("escape", close),
      Match.when("down", () =>
        Option.isSome(state.open) ? moveItem(1) : openActive(),
      ),
      Match.when("up", () =>
        Option.isSome(state.open) ? moveItem(-1) : openActive(),
      ),
      Match.orElse(() => {}),
    );
  };

  useWindowKey((event) => {
    const chord = chordOf(event.key ?? "", {
      cmd: event.modifiers?.cmd === true,
      ctrl: event.modifiers?.ctrl === true,
      alt: event.modifiers?.alt === true,
      shift: event.modifiers?.shift === true,
    });
    Option.match(
      Option.flatMap(chord, (value) => acceleratorCommand(MENUS, value)),
      {
        onNone: () => {},
        onSome: (command) => {
          setRuns((count) => count + 1);
          setLast(`accel:${command}`);
          if (Option.isSome(state.open)) apply(closeMenu(state));
        },
      },
    );
  });

  const surface = (menu: Menu): ReactNode => (
    <div
      testId={surfaceId(menu)}
      aria-id={surfaceId(menu)}
      aria-label={menu.label}
      role="menu"
      style={{
        display: "flex",
        flexDirection: "column",
        width: MENU_WIDTH,
        paddingTop: 4,
        paddingBottom: 4,
        backgroundColor: theme.colors.popover,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
      }}
    >
      {Arr.map(menu.items, (item) => (
        <div
          key={item.id}
          testId={itemId(menu, item)}
          aria-id={itemId(menu, item)}
          aria-label={item.label}
          role="menuitem"
          tabIndex={-1}
          ref={capture(itemId(menu, item))}
          onClick={() => run(item)}
          onKeyDown={(event) => {
            if (event.key === "enter") run(item);
          }}
          style={{
            height: ITEM_HEIGHT,
            flexShrink: 0,
            paddingLeft: theme.spacing.md,
            paddingRight: theme.spacing.md,
            justifyContent: "center",
            backgroundColor: theme.colors.popover,
            hover: {
              backgroundColor: item.disabled
                ? theme.colors.popover
                : theme.colors.accent,
            },
          }}
        >
          <text
            style={{
              fontSize: 12,
              color: item.disabled
                ? theme.colors.mutedForeground
                : theme.colors.foreground,
            }}
          >
            {Option.match(item.accelerator, {
              onNone: () => item.label,
              onSome: (chord) => `${item.label}   ${chord}`,
            })}
          </text>
        </div>
      ))}
    </div>
  );

  const openMenuId = Option.match(state.open, {
    onNone: () => "none",
    onSome: (index) =>
      Option.getOrElse(
        Option.map(Arr.get(MENUS, index), (menu) => menu.id),
        () => "none",
      ),
  });
  const currentItem = Option.match(
    Option.flatMap(state.open, (index) =>
      Option.flatMap(Arr.get(MENUS, index), (menu) =>
        Arr.get(menu.items, state.item),
      ),
    ),
    { onNone: () => "none", onSome: (item) => item.id },
  );

  return (
    <div
      testId="menubar-frame"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: 640,
        padding: 16,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        testId="menubar-bar"
        aria-id="menubar-bar"
        aria-label="Application"
        role="menubar"
        onKeyDown={onBarKeyDown}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          width: 400,
          height: BAR_HEIGHT,
          paddingLeft: 4,
          backgroundColor: theme.colors.muted,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        {Arr.map(MENUS, (menu, index) => (
          <div
            key={menu.id}
            testId={titleId(menu)}
            aria-id={titleId(menu)}
            aria-label={menu.label}
            role="menuitem"
            aria-expanded={Option.contains(state.open, index)}
            tabIndex={0}
            ref={capture(titleId(menu))}
            onClick={() => press(index)}
            onMouseEnter={() => hover(index)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: TITLE_HEIGHT,
              paddingLeft: theme.spacing.sm,
              paddingRight: theme.spacing.sm,
              borderRadius: theme.radius.sm,
              backgroundColor: Option.contains(state.open, index)
                ? theme.colors.accent
                : theme.colors.muted,
              hover: {
                backgroundColor: menu.disabled
                  ? theme.colors.muted
                  : theme.colors.border,
              },
            }}
          >
            <text
              style={{
                fontSize: 12,
                color: menu.disabled
                  ? theme.colors.mutedForeground
                  : theme.colors.foreground,
              }}
            >
              {menu.label}
            </text>
            {Option.contains(state.open, index) ? (
              <FloatingLayer side="bottom" align="start" sideOffset={2}>
                {surface(menu)}
              </FloatingLayer>
            ) : null}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 160,
        }}
      >
        <Pressable
          testId="menubar-outside"
          onClick={() => {
            setOutside((count) => count + 1);
            apply(closeMenu(state));
          }}
        >
          <text style={{ fontSize: 12, color: theme.colors.foreground }}>
            outside
          </text>
        </Pressable>
        <Readout testId="menubar-readout">
          {`open=${openMenuId} item=${currentItem} runs=${runs} last=${last} outside=${outside} want=${want.target}`}
        </Readout>
      </div>
    </div>
  );
};

const readout = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(
    Option.fromNullishOr(ctx.host.text("menubar-readout")),
    () => "none",
  );

const focused = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.focused()), () => "none");

const boundsOf = (ctx: Smoke.SmokeContext, testId: string, label: string) =>
  ctx.expectSome(label, Option.fromNullishOr(ctx.host.bounds(testId)));

const painted = (ctx: Smoke.SmokeContext, testId: string): boolean =>
  Option.isSome(Option.fromNullishOr(ctx.host.bounds(testId)));

const nodeOf = (ctx: Smoke.SmokeContext, authorId: string) =>
  Option.flatMap(Option.fromNullishOr(ctx.host.a11y()), (tree) =>
    Option.flatMap(
      Arr.findFirst(Object.values(tree.nodes), (entry) =>
        Option.exists(entry.aria, (aria) =>
          Option.contains(aria.author_id, authorId),
        ),
      ),
      (entry) => entry.aria,
    ),
  );

const roleOf = (ctx: Smoke.SmokeContext, authorId: string): string =>
  Option.getOrElse(
    Option.flatMap(nodeOf(ctx, authorId), (node) => node.role),
    () => "none",
  );

const expandedOf = (ctx: Smoke.SmokeContext, authorId: string): boolean =>
  Option.getOrElse(
    Option.flatMap(nodeOf(ctx, authorId), (node) => node.expanded),
    () => false,
  );

export const menuBarScenario: PlaygroundScenario = {
  id: "menu-bar",
  title: "Application menu bar: switching, roving rows and accelerators",
  capability: "menubar",
  view: () => <MenuBarProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const bar = yield* boundsOf(ctx, "menubar-bar", "the menu bar paints");
      const file = yield* boundsOf(
        ctx,
        "menubar-file",
        "the File title paints",
      );
      const edit = yield* boundsOf(
        ctx,
        "menubar-edit",
        "the Edit title paints",
      );
      const view = yield* boundsOf(
        ctx,
        "menubar-view",
        "the View title paints",
      );
      const help = yield* boundsOf(
        ctx,
        "menubar-help",
        "the Help title paints",
      );
      // 0.10.0 reports the border box minus its 1 px borders (plan 529 §6.3).
      yield* ctx.expectNear(
        "the bar is 26 px inside its borders",
        bar.height,
        26,
        1,
      );
      yield* ctx.expectEqual(
        "the titles are one left-to-right row",
        file.x < edit.x && edit.x < view.x && view.x < help.x,
        true,
      );
      yield* ctx.expectEqual(
        "the bar starts closed",
        readout(ctx),
        "open=none item=none runs=0 last=none outside=0 want=none",
      );

      // Open File: the surface is under the title, the first row has focus.
      ctx.host.click("menubar-file");
      yield* ctx.expectContains(
        "a click opens File",
        readout(ctx),
        "open=file",
      );
      yield* ctx.expectContains(
        "File highlights New",
        readout(ctx),
        "item=new",
      );
      const surface = yield* boundsOf(
        ctx,
        "menubar-file-surface",
        "the File menu paints",
      );
      yield* ctx.expectNear(
        "the surface starts under its title",
        // The surface's content box starts 5 px inside it (plan 529 §6.3).
        surface.y,
        file.y + file.height + 7,
        2,
      );
      yield* ctx.expectNear(
        "the surface aligns to the title's start",
        surface.x,
        file.x,
        2,
      );
      yield* ctx.expectEqual(
        "every File row paints, including the disabled one",
        [
          "menu-file-new",
          "menu-file-open",
          "menu-file-save",
          "menu-file-save-as",
        ].every((id) => painted(ctx, id)),
        true,
      );
      yield* ctx.expectEqual(
        "opening focuses the first row",
        focused(ctx),
        "menu-file-new",
      );

      // A disabled row is inert and the arrows skip it.
      ctx.host.click("menu-file-save-as");
      yield* ctx.expectContains(
        "a disabled row runs nothing",
        readout(ctx),
        "runs=0 last=none",
      );
      ctx.host.key("down");
      yield* ctx.expectEqual(
        "Down roves to the next row",
        focused(ctx),
        "menu-file-open",
      );
      ctx.host.key("down");
      ctx.host.key("down");
      yield* ctx.expectContains(
        "Down wraps over the disabled row",
        readout(ctx),
        "item=new",
      );
      yield* ctx.expectEqual(
        "the wrapped row takes focus",
        focused(ctx),
        "menu-file-new",
      );
      ctx.host.key("up");
      yield* ctx.expectContains(
        "Up wraps over the disabled row",
        readout(ctx),
        "item=save",
      );

      // Right/Left switch the open menu and skip the disabled View.
      ctx.host.key("right");
      yield* ctx.expectContains(
        "Right opens the neighbouring menu",
        readout(ctx),
        "open=edit",
      );
      yield* ctx.expectEqual(
        "the neighbour's first row takes focus",
        focused(ctx),
        "menu-edit-undo",
      );
      ctx.host.key("right");
      yield* ctx.expectContains(
        "Right skips a disabled menu",
        readout(ctx),
        "open=help",
      );
      ctx.host.key("right");
      yield* ctx.expectContains(
        "Right wraps to File",
        readout(ctx),
        "open=file",
      );
      ctx.host.key("left");
      yield* ctx.expectContains(
        "Left wraps to Help",
        readout(ctx),
        "open=help",
      );

      // Escape closes and returns focus to the open title.
      ctx.host.key("escape");
      yield* ctx.expectContains(
        "Escape closes the menu",
        readout(ctx),
        "open=none",
      );
      yield* ctx.expectEqual(
        "Escape returns focus to the open title",
        focused(ctx),
        "menubar-help",
      );

      // Hover switches while open and is inert while closed.
      ctx.host.hover("menubar-edit");
      yield* ctx.expectContains(
        "hover is inert on a closed bar",
        readout(ctx),
        "open=none",
      );
      ctx.host.click("menubar-file");
      ctx.host.hover("menubar-edit");
      yield* ctx.expectContains(
        "hover switches the open menu",
        readout(ctx),
        "open=edit",
      );
      yield* ctx.expectEqual(
        "hover focuses the switched menu's first row",
        focused(ctx),
        "menu-edit-undo",
      );
      ctx.host.hover("menubar-view");
      yield* ctx.expectContains(
        "hovering a disabled menu changes nothing",
        readout(ctx),
        "open=edit",
      );
      ctx.host.hover("menubar-help");
      yield* ctx.expectContains(
        "hover reaches the last menu",
        readout(ctx),
        "open=help",
      );

      // Activation runs once, closes, and returns focus to the title.
      ctx.host.hover("menubar-edit");
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "Enter runs the focused row once",
        readout(ctx),
        "runs=1 last=undo",
      );
      yield* ctx.expectContains(
        "activation closes the menu",
        readout(ctx),
        "open=none",
      );
      yield* ctx.expectEqual(
        "activation returns focus to the title",
        focused(ctx),
        "menubar-edit",
      );

      // A second press toggles the open menu shut.
      ctx.host.click("menubar-edit");
      yield* ctx.expectContains(
        "a click reopens Edit",
        readout(ctx),
        "open=edit",
      );
      ctx.host.click("menubar-edit");
      yield* ctx.expectContains(
        "a second click closes it",
        readout(ctx),
        "open=none",
      );
      yield* ctx.expectEqual(
        "the toggle returns focus to the title",
        focused(ctx),
        "menubar-edit",
      );

      // An outside control dismisses without running a menu row.
      ctx.host.click("menubar-file");
      ctx.host.click("menubar-outside");
      yield* ctx.expectContains(
        "an outside press closes the menu",
        readout(ctx),
        "open=none",
      );
      yield* ctx.expectContains(
        "the outside control itself runs",
        readout(ctx),
        "outside=1",
      );
      yield* ctx.expectContains("no menu row ran", readout(ctx), "runs=1");

      // Accelerators: app-owned, once, inert when disabled.
      ctx.host.key("cmd-s");
      yield* ctx.expectContains(
        "a chord runs its command once",
        readout(ctx),
        "runs=2 last=accel:save",
      );
      yield* ctx.expectContains(
        "a chord does not open a menu",
        readout(ctx),
        "open=none",
      );
      ctx.host.key("cmd-shift-s");
      yield* ctx.expectContains(
        "a disabled row's chord is inert",
        readout(ctx),
        "runs=2 last=accel:save",
      );
      ctx.host.click("menubar-file");
      ctx.host.key("cmd-o");
      yield* ctx.expectContains(
        "a chord with a menu open still runs once",
        readout(ctx),
        "runs=3 last=accel:open",
      );
      yield* ctx.expectContains(
        "a chord dismisses the open menu",
        readout(ctx),
        "open=none",
      );
      yield* ctx.expectEqual(
        "the chord's dismissal returns focus to the title",
        focused(ctx),
        "menubar-file",
      );

      // A pointer activation runs the row once and returns focus.
      ctx.host.click("menubar-file");
      ctx.host.click("menu-file-save");
      yield* ctx.expectContains(
        "a clicked row runs once",
        readout(ctx),
        "runs=4 last=save",
      );
      yield* ctx.expectContains(
        "a clicked row closes the menu",
        readout(ctx),
        "open=none",
      );
      yield* ctx.expectEqual(
        "a clicked row returns focus to the title",
        focused(ctx),
        "menubar-file",
      );

      // The accessibility model.
      yield* ctx.expectEqual(
        "the bar is exposed as a menu bar",
        roleOf(ctx, "menubar-bar"),
        "MenuBar",
      );
      yield* ctx.expectEqual(
        "a title is a menu item",
        roleOf(ctx, "menubar-file"),
        "MenuItem",
      );
      ctx.host.click("menubar-file");
      yield* ctx.expectEqual(
        "an open title announces expansion",
        expandedOf(ctx, "menubar-file"),
        true,
      );
      yield* ctx.expectEqual(
        "the surface is a menu",
        roleOf(ctx, "menubar-file-surface"),
        "Menu",
      );
      yield* ctx.expectEqual(
        "a row is a menu item",
        roleOf(ctx, "menu-file-new"),
        "MenuItem",
      );
      ctx.host.key("escape");
      yield* ctx.expectEqual(
        "a closed title does not announce expansion",
        expandedOf(ctx, "menubar-file"),
        false,
      );
    }),
};
