import type { SystemPalette } from "./system-theme.js";

export type OmarchyProblemReason = "syntax" | "duplicate" | "empty" | "mode";

export interface OmarchyProblem {
  readonly line: number;

  readonly text: string;

  readonly reason: OmarchyProblemReason;
}

export interface OmarchyPaletteFile {
  readonly palette: SystemPalette;

  readonly problems: readonly OmarchyProblem[];
}

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

interface Entry {
  readonly value: string;
  readonly line: number;
  readonly text: string;
}

interface RawValue {
  readonly text: string;
  readonly quoted: boolean;
}

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

const readKey = (line: string): string | undefined => {
  const separator = line.indexOf("=");
  const key = separator === -1 ? "" : line.slice(0, separator).trim();
  return /^[a-z0-9_]+$/.test(key) ? key : undefined;
};

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

const resolve = (
  entries: ReadonlyMap<string, Entry>,
  names: readonly string[],
): string | undefined =>
  names
    .map((name) => entries.get(name)?.value)
    .find((value): value is string => value !== undefined);

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

      ...(muted === undefined ? {} : { muted, border: muted }),
      ...(accent === undefined ? {} : { accent }),
      ...(danger === undefined ? {} : { danger }),
      ...(selection === undefined ? {} : { selection }),
    },
    problems,
  };
}
