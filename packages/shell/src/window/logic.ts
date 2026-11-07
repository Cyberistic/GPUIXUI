import type { WindowOptions } from "@gpuix/native";
import type { PlatformName, Theme } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export const TRAFFIC_LIGHT_INSET = 90;

export const TRAFFIC_LIGHT_X = 20;

const TRAFFIC_LIGHT_SIZE = 12;

export const TOOLBAR_HEIGHT = { unified: 52, compact: 38 } as const;

export type ToolbarStyle = keyof typeof TOOLBAR_HEIGHT;

export const hasTrafficLights = (
  platform: PlatformName,
  terminal: boolean,
): boolean => platform === "darwin" && !terminal;

/** The window options a theme's chrome needs; spread into `render(…, options)`. */
export type NativeWindowOptions = Pick<
  WindowOptions,
  "titlebarTransparent" | "windowBackground" | "trafficLightX" | "trafficLightY"
>;

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
