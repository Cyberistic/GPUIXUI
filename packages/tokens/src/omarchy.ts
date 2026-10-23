/**
 * Omarchy's `colors.toml`, decoded.
 *
 * Omarchy (the Hyprland/Arch setup) activates a theme by staging it under
 * `~/.local/state/omarchy/current/theme/`; the palette its templates read is
 * that directory's `colors.toml`, which the project documents in
 * `docs/theming.md` (MIT, `omacom/omarchy`). The file is flat TOML — `mode`, a
 * three-colour accent/selection/muted group, the neutral ramp and the ANSI
 * names — and {@link decodeOmarchyPalette} is the reader from that file to the
 * semantic shape {@link paletteToTokens} turns into a theme.
 *
 * It reads the names the format documents rather than copying roles.
 * `accent` is Omarchy's word for the fill this library calls `primary`; `red`
 * is what the shell paints as its urgent colour, this library's `destructive`;
 * and `muted` — "comments, placeholders, dividers" — is **both** quiet roles,
 * the `muted` strip and the decorative `border`. A theme generated from an
 * Alacritty palette names no `muted`, `red` or `accent` at all: it carries
 * `color8`, `color1` and `color4`, which Omarchy's own palette defines as the
 * same colours, so those are the fallbacks. The legacy `bg`/`fg` names are read
 * too. A canonical name wins over its fallback whichever line comes first.
 *
 * What it will not do is guess. Only the flat subset is understood: a table
 * header (whose keys would be a section rather than a palette), a line without
 * `=`, an unquoted colour, a duplicated colour key and an empty value are
 * **reported**
 * in `problems` and left out of the palette, so the role keeps the base theme's
 * value instead of a typo becoming a colour. The ANSI names the file carries
 * for its terminal (`color2`, `bright_red`, …) are well-formed keys this
 * library has no role for, so they are ignored rather than reported. `mode` is
 * carried on the palette when it says `light` or `dark`, because the page alone
 * cannot tell a mid-grey one.
 *
 * @example
 * ```ts
 * import { readFileSync } from "node:fs";
 * import { decodeOmarchyPalette, paletteToTokens } from "@gpuixui/tokens";
 *
 * const file = decodeOmarchyPalette(
 *   readFileSync("~/.local/state/omarchy/current/theme/colors.toml", "utf8"),
 * );
 * const theme = paletteToTokens(file.palette); // the palette carries its mode
 * ```
 */

import type { SystemPalette } from "./system-theme.js";

/** Why a line was left out of the palette. */
export type OmarchyProblemReason =
  /** Not a flat `key = "value"` line the format documents. */
  | "syntax"
  /** A key this reader needs, stated a second time; the first statement stands. */
  | "duplicate"
  /** A colour key with no value in it. */
  | "empty"
  /** A `mode` that is neither `light` nor `dark`. */
  | "mode";

/** A line the decoder read but could not use. */
export interface OmarchyProblem {
  /** 1-based line number in the source. */
  readonly line: number;
  /** The line, trimmed. */
  readonly text: string;
  /** What made it unusable. */
  readonly reason: OmarchyProblemReason;
}

/** The palette `colors.toml` names and the lines it lost. */
export interface OmarchyPaletteFile {
  /**
   * The roles the file names, and the `mode` it declares.
   *
   * A role the file does not name is absent, not empty; `palette.mode` is absent
   * when the file names none this library knows, and `paletteMode` then falls
   * back to the page's lightness.
   */
  readonly palette: SystemPalette;
  /** Every line that was read and left out, in source order. */
  readonly problems: readonly OmarchyProblem[];
}

/**
 * The colour keys this reader understands.
 *
 * Every other well-formed key is the file's own vocabulary — the ANSI ramp, a
 * template's gradient — and no role here answers to it.
 */
const colourKeys: ReadonlySet<string> = new Set([
  "accent",
  "background",
  "bg",
  "color1",
  "color4",
  "color8",
  "fg",
  "foreground",
  "muted",
  "red",
  "selection",
]);

/** One value on the right of `=` and where it was written. */
interface Entry {
  readonly value: string;
  readonly line: number;
  readonly text: string;
}

/** A value as written: its text and whether the file quoted it. */
interface RawValue {
  readonly text: string;
  readonly quoted: boolean;
}

/**
 * The value of a `key = value` line, or `undefined` when it is not one.
 *
 * The format quotes every colour and states `mode` as a bare word, so a quoted
 * string and a bare word are both read; a trailing `#` comment is allowed after
 * either. An unterminated quote, or anything trailing a closed one that is not a
 * comment, is the syntax this reader refuses.
 */
const readValue = (source: string): RawValue | undefined => {
  const delimiter = source[0];
  if (delimiter === '"' || delimiter === "'") {
    const end = source.indexOf(delimiter, 1);
    if (end === -1) {
      return undefined;
    }
    const rest = source.slice(end + 1).trim();
    if (rest !== "" && !rest.startsWith("#")) {
      return undefined;
    }
    return { text: source.slice(1, end).trim(), quoted: true };
  }
  const bare = source.split("#")[0]?.trim() ?? "";
  return /^[A-Za-z0-9_.-]+$/.test(bare)
    ? { text: bare, quoted: false }
    : undefined;
};

/** The key a line names, or `undefined` when the line is not a flat key/value pair. */
const readKey = (line: string): string | undefined => {
  const separator = line.indexOf("=");
  const key = separator === -1 ? "" : line.slice(0, separator).trim();
  return /^[a-z0-9_]+$/.test(key) ? key : undefined;
};

/**
 * Read every flat key this reader can use, and name the lines it cannot.
 *
 * A table header ends the top-level palette: TOML's root keys come before its
 * first section, so a `[colors]` line means the rest of the file belongs to a
 * section this reader does not understand, and reading its keys as palette roles
 * would be the quiet mistake the report exists to prevent.
 */
const readEntries = (
  source: string,
): {
  readonly entries: ReadonlyMap<string, Entry>;
  readonly problems: OmarchyProblem[];
} => {
  const entries = new Map<string, Entry>();
  const problems: OmarchyProblem[] = [];
  let inSection = false;
  source
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .forEach((raw, index) => {
      const text = raw.trim();
      if (inSection || text === "" || text.startsWith("#")) {
        return;
      }
      const line = index + 1;
      const problem = (reason: OmarchyProblemReason): void => {
        problems.push({ line, text, reason });
      };
      if (text.startsWith("[")) {
        inSection = true;
        problem("syntax");
        return;
      }
      const separator = text.indexOf("=");
      const key = readKey(text);
      if (separator === -1 || key === undefined) {
        problem("syntax");
        return;
      }
      const value = readValue(text.slice(separator + 1).trim());
      if (value === undefined) {
        problem("syntax");
        return;
      }
      const isColour = colourKeys.has(key);
      if (isColour && !value.quoted) {
        problem("syntax");
        return;
      }
      if (!isColour && key !== "mode") {
        return;
      }
      if (entries.has(key)) {
        problem("duplicate");
        return;
      }
      if (value.text === "") {
        problem("empty");
        return;
      }
      entries.set(key, { value: value.text, line, text });
    });
  return { entries, problems };
};

/** The first of `names` the file states, in precedence order. */
const resolve = (
  entries: ReadonlyMap<string, Entry>,
  names: readonly string[],
): string | undefined =>
  names
    .map((name) => entries.get(name)?.value)
    .find((value): value is string => value !== undefined);

/**
 * Decode Omarchy's `colors.toml` into the palette this library maps.
 *
 * The result is the palette, the mode the file declares, and every line that was
 * left out. A line is left out rather than guessed at, and the caller's boundary
 * owns what to do with the report — log it beside the theme it applied, so a
 * theme whose `colors.toml` is not the flat format this reader understands is a
 * visible mix of the palette and the base theme instead of a silent one.
 *
 * The colours are handed over as written, so a file naming a value the renderer
 * cannot parse is `auditTheme`'s report rather than this reader's: the two
 * questions — "did I understand this line" and "can the renderer paint this
 * colour" — are answered by the two seams that measure them.
 *
 * @example
 * ```ts
 * import { decodeOmarchyPalette } from "@gpuixui/tokens";
 *
 * const file = decodeOmarchyPalette(`
 * mode = "dark"
 * accent = "#7aa2f7"
 * muted = "#414868"
 * background = "#1a1b26"
 * foreground = "#a9b1d6"
 * red = "#f7768e"
 * selection = "#292e42"
 * `);
 *
 * file.palette.mode; // "dark"
 * file.palette.accent; // "#7aa2f7"
 * file.palette.border; // "#414868" — Omarchy's one quiet colour, both roles
 * file.problems; // []
 * ```
 */
export function decodeOmarchyPalette(source: string): OmarchyPaletteFile {
  const { entries, problems } = readEntries(source);
  const declared = entries.get("mode");
  const mode =
    declared?.value === "light" || declared?.value === "dark"
      ? declared.value
      : undefined;
  if (declared !== undefined && mode === undefined) {
    problems.push({ line: declared.line, text: declared.text, reason: "mode" });
  }
  const background = resolve(entries, ["background", "bg"]);
  const foreground = resolve(entries, ["foreground", "fg"]);
  const muted = resolve(entries, ["muted", "color8"]);
  const accent = resolve(entries, ["accent", "color4"]);
  const danger = resolve(entries, ["red", "color1"]);
  const selection = resolve(entries, ["selection"]);
  return {
    palette: {
      ...(mode === undefined ? {} : { mode }),
      ...(background === undefined ? {} : { background }),
      ...(foreground === undefined ? {} : { foreground }),
      // One quiet colour carries both quiet roles: Omarchy's `muted` is what its
      // templates paint a divider and a de-emphasised label with.
      ...(muted === undefined ? {} : { muted, border: muted }),
      ...(accent === undefined ? {} : { accent }),
      ...(danger === undefined ? {} : { danger }),
      ...(selection === undefined ? {} : { selection }),
    },
    problems,
  };
}
