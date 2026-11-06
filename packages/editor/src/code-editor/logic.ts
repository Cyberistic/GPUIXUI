import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";

export const TAB_MODES = ["insert", "focus"] as const;

export const TabModes = Schema.Literals(TAB_MODES);

export type TabMode = typeof TabModes.Type;

export const isTabMode = Schema.is(TabModes);

export const tabModeOf = (value: unknown): TabMode =>
  isTabMode(value) ? value : "insert";

export const TAB_INDENT = "  ";

export const tabIndent = (indent: unknown): string =>
  typeof indent === "string" ? indent : TAB_INDENT;

export const tabInserts = (
  mode: TabMode,
  indent: string = TAB_INDENT,
): boolean => mode === "insert" && indent.length > 0;

export const leadingIndent = (line: string): string =>
  Arr.join(
    Arr.takeWhile(Str.split(line, ""), (c) => c === " " || c === "\t"),
    "",
  );

export const visibleRows = (documentRows: number, minRows?: number): number =>
  Math.max(
    Number.isFinite(documentRows) ? Math.max(1, Math.floor(documentRows)) : 1,
    minRows !== undefined && Number.isFinite(minRows)
      ? Math.max(0, Math.floor(minRows))
      : 0,
  );

export const enterIndent = (value: string): string =>
  Option.match(Arr.last(Str.split(/\r\n?|\n/)(value)), {
    onNone: () => "",
    onSome: leadingIndent,
  });
