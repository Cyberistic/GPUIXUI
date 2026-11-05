/**
 * The native window's geometry and its source list's keyboard, as pure rules.
 *
 * A Mac window has one anatomy: the sidebar runs edge to edge under the traffic
 * lights, a unified toolbar sits over the content column, and the content is
 * opaque. The lights float over the app's own chrome only when the window opens
 * with `titlebarTransparent`, so the app has to leave them their box — and only
 * on macOS, in a window rather than a terminal.
 */

import type { WindowOptions } from "@gpuix/native";
import type { PlatformName, Theme } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/**
 * The room the three traffic lights take from the leading edge, with their gap.
 * macOS 26 draws 14-point lights 23 points apart, so the third ends near 79
 * points; the title starts 11 points past it, where AppKit puts it.
 */
export const TRAFFIC_LIGHT_INSET = 90;

/** The lights' leading offset: AppKit's 20 points. */
export const TRAFFIC_LIGHT_X = 20;

/** The lights' own diameter. */
const TRAFFIC_LIGHT_SIZE = 12;

/** The toolbar's height per style: AppKit's unified 52 and compact 38 points. */
export const TOOLBAR_HEIGHT = { unified: 52, compact: 38 } as const;

/** A toolbar style the window knows a height for. */
export type ToolbarStyle = keyof typeof TOOLBAR_HEIGHT;

/** Whether the OS's traffic lights float over the app's chrome. */
export const hasTrafficLights = (
  platform: PlatformName,
  terminal: boolean,
): boolean => platform === "darwin" && !terminal;

/** The window options a theme's chrome needs; spread into `render(…, options)`. */
export type NativeWindowOptions = Pick<
  WindowOptions,
  "titlebarTransparent" | "windowBackground" | "trafficLightX" | "trafficLightY"
>;

/**
 * The options that open a native window: on macOS a transparent titlebar, the
 * theme's window background (vibrant on darwin, plan 721) and the lights
 * centred on the toolbar's line; nothing elsewhere, where the system bar stays.
 */
export const nativeWindowOptions = (
  theme: Theme,
  platform: PlatformName,
  toolbar: ToolbarStyle = "unified",
): NativeWindowOptions =>
  platform !== "darwin"
    ? {}
    : {
        titlebarTransparent: true,
        windowBackground: theme.window ?? "opaque",
        trafficLightX: TRAFFIC_LIGHT_X,
        trafficLightY: (TOOLBAR_HEIGHT[toolbar] - TRAFFIC_LIGHT_SIZE) / 2,
      };

/** The toolbar's leading padding: the lights' box when they float over it. */
export const toolbarInset = (lightsOverToolbar: boolean): number =>
  lightsOverToolbar ? TRAFFIC_LIGHT_INSET : 12;

/** A source-list key that moves the selection. */
export type SourceListKey = "up" | "down" | "home" | "end";

/**
 * The row a key selects: one step, or the first or last row. The selection
 * stops at either end, as AppKit's outline view does — it does not wrap.
 */
export const moveSelection = (
  ids: ReadonlyArray<string>,
  current: string,
  key: SourceListKey,
): Option.Option<string> => {
  const last = ids.length - 1;
  if (last < 0) return Option.none();
  const at = Option.getOrElse(
    Arr.findFirstIndex(ids, (id) => id === current),
    () => -1,
  );
  const index =
    key === "home"
      ? 0
      : key === "end"
        ? last
        : Math.min(last, Math.max(0, at + (key === "down" ? 1 : -1)));
  return Arr.get(ids, index);
};

/**
 * The rows a reader can reach: every item of an open section, none of a folded
 * one. The arrows and type-ahead walk this list, so a folded place is skipped
 * rather than chosen out of sight.
 */
export const visibleIds = (
  sections: ReadonlyArray<{
    readonly id: string;
    readonly items: ReadonlyArray<{ readonly id: string }>;
  }>,
  folded: ReadonlySet<string>,
): ReadonlyArray<string> =>
  Arr.flatMap(sections, (section) =>
    folded.has(section.id) ? [] : Arr.map(section.items, (item) => item.id),
  );
