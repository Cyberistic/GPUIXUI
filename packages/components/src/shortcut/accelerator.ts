/**
 * The accelerator model: `"mod+shift+k"` in, platform keycaps out.
 *
 * One grammar serves the shortcut display and the hotkey recorder, so the two
 * cannot drift. Parsing is total — an unknown token still displays — because a
 * consumer's accelerator is content, not a domain value that can be rejected.
 * `mod` adapts to the platform; `cmd` and `ctrl` name a specific key everywhere.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Str from "effect/String";
import { currentPlatform, type PlatformName } from "../internal/theme.js";

/** The platform whose keyboard glyphs a chord is rendered with. */
export type AcceleratorPlatform = PlatformName;

const isApple = (platform: AcceleratorPlatform): boolean =>
  platform === "darwin";

/** Every known token's display string, as a function of the platform family. */
const DISPLAY: Readonly<Record<string, (apple: boolean) => string>> = {
  mod: (apple) => (apple ? "⌘" : "Ctrl"),
  cmd: () => "⌘",
  meta: () => "⌘",
  ctrl: () => "Ctrl",
  control: () => "Ctrl",
  alt: (apple) => (apple ? "⌥" : "Alt"),
  option: (apple) => (apple ? "⌥" : "Alt"),
  shift: (apple) => (apple ? "⇧" : "Shift"),
  enter: (apple) => (apple ? "↵" : "Enter"),
  return: (apple) => (apple ? "↵" : "Enter"),
  escape: () => "Esc",
  space: () => "Space",
  tab: () => "Tab",
  backspace: (apple) => (apple ? "⌫" : "Backspace"),
  delete: (apple) => (apple ? "⌦" : "Del"),
  up: (apple) => (apple ? "↑" : "Up"),
  down: (apple) => (apple ? "↓" : "Down"),
  left: (apple) => (apple ? "←" : "Left"),
  right: (apple) => (apple ? "→" : "Right"),
  pageup: () => "PgUp",
  pagedown: () => "PgDn",
  home: () => "Home",
  end: () => "End",
};

/** One token's display string for a platform. */
const displayKey = (token: string, platform: AcceleratorPlatform): string =>
  Option.match(R.get(DISPLAY, token), {
    onNone: () =>
      token.length === 1
        ? Str.toUpperCase(token)
        : `${Str.toUpperCase(Str.slice(0, 1)(token))}${Str.slice(1)(token)}`,
    onSome: (format) => format(isApple(platform)),
  });

/** The tokens of a chord, lower-cased, with empty segments dropped. */
export const parseAccelerator = (accelerator: string): ReadonlyArray<string> =>
  Arr.map(
    Arr.filter(
      Str.split("+")(accelerator),
      (segment) => Str.trim(segment) !== "",
    ),
    (segment) => Str.toLowerCase(Str.trim(segment)),
  );

/** One chord's keycaps in the author's order, for the given platform. */
export const formatAccelerator = (
  accelerator: string,
  platform: AcceleratorPlatform = currentPlatform,
): ReadonlyArray<string> =>
  Arr.map(parseAccelerator(accelerator), (token) =>
    displayKey(token, platform),
  );
