import type { CommandAction } from "@gpuixui/components/command-menu";
import {
  MODES,
  type CalculatorCommand,
  type CalculatorModel,
  type CalculatorState,
  type Mode,
} from "@gpuixui/calc";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

export interface PaletteEntry {
  readonly action: CommandAction;

  readonly keywords: string;
}

export const paletteEntries = (
  model: CalculatorModel,
  handlers: {
    readonly runEngine: (command: CalculatorCommand) => void;
    readonly toggleAppearance: () => void;
    readonly showHistory: () => void;
  },
): ReadonlyArray<PaletteEntry> => {
  const engine: ReadonlyArray<PaletteEntry> = Arr.map(
    model.catalog,
    (command) => ({
      action: {
        id: command.id,
        label: command.label,
        group: command.group,
        ...(command.shortcut === undefined
          ? {}
          : { shortcut: command.shortcut }),
        perform: () => handlers.runEngine(command),
      },
      keywords: Arr.join(command.keywords, " "),
    }),
  );
  const app: ReadonlyArray<PaletteEntry> = [
    {
      action: {
        id: "app:appearance",
        label: "Toggle appearance",
        group: "App",
        shortcut: "⌘⇧L",
        perform: handlers.toggleAppearance,
      },
      keywords: "theme dark light mode appearance",
    },
    {
      action: {
        id: "app:history",
        label: "Show calculation history",
        group: "App",
        shortcut: "⌘H",
        perform: handlers.showHistory,
      },
      keywords: "history previous replay",
    },
  ];
  const modeRows: ReadonlyArray<PaletteEntry> = Arr.map(MODES, (mode) => ({
    action: {
      id: `mode:${mode.mode}`,
      label: `Mode: ${mode.label} — ${mode.summary}`,
      group: "Modes",
      shortcut: `⌘${mode.index}`,
      perform: () =>
        handlers.runEngine({
          id: `mode:${mode.mode}`,
          label: mode.label,
          group: "Modes",
          keywords: [],
          action: { _tag: "mode", mode: mode.mode },
        }),
    },
    keywords: `${mode.mode} ${mode.summary} mode ${mode.index}`,
  }));
  return Arr.filter(
    [
      ...Arr.filter(
        engine,
        (entry) => !Str.startsWith("mode:")(entry.action.id),
      ),
      ...modeRows,
      ...app,
    ],
    (entry) => entry.action.id !== "app:commands",
  );
};

export const paletteMatches = (entry: PaletteEntry, query: string): boolean => {
  const wanted = Str.toLowerCase(Str.trim(query));
  if (wanted === "") return true;
  const haystack = Str.toLowerCase(`${entry.action.label} ${entry.keywords}`);
  if (Str.includes(wanted)(haystack)) return true;
  let index = 0;
  const characters = [...wanted];
  return Arr.every(characters, (character) => {
    const found = haystack.indexOf(character, index);
    if (found < 0) return false;
    index = found + 1;
    return true;
  });
};

export const statusItems = (
  state: CalculatorState,
): {
  readonly left: ReadonlyArray<{ readonly id: string; readonly label: string }>;
  readonly right: ReadonlyArray<{
    readonly id: string;
    readonly label: string;
  }>;
} => ({
  left: [
    { id: "mode", label: state.mode },
    { id: "angle", label: state.setup.angle },
    {
      id: "number",
      label:
        state.setup.number.kind === "Fix"
          ? `Fix ${state.setup.number.digits}`
          : state.setup.number.kind === "Sci"
            ? `Sci ${state.setup.number.digits}`
            : state.setup.number.kind,
    },
    { id: "display", label: state.setup.display },
    { id: "memory", label: state.memory === 0 ? "M —" : `M ${state.memory}` },
  ],
  right: [
    { id: "title", label: "fx-991ES Plus" },
    { id: "commands", label: "⌘K commands" },
  ],
});

export const modeForShortcut = (index: number): Mode | null =>
  MODES[index - 1]?.mode ?? null;

export const modeMenu: ReadonlyArray<string> = Arr.map(
  MODES,
  (mode) => `${mode.index}:${mode.label}`,
);

export const modeMenuPick = (key: string): Option.Option<Mode> =>
  /^[1-8]$/.test(key)
    ? Option.fromNullishOr(modeForShortcut(Number(key)))
    : Option.none();

export type InspectorTab = "history" | "mode" | "catalog";

export type ShiftMenu =
  | {
      readonly _tag: "panel";
      readonly tab: InspectorTab;
      readonly mode: Option.Option<Mode>;
    }
  | { readonly _tag: "setup" };

const SHIFT_MODES: Readonly<Record<string, Mode>> = {
  "1": "STAT",
  "2": "CMPLX",
  "3": "BASE-N",
  "4": "MATRIX",
  "5": "VECTOR",
};

export const shiftMenu = (key: string): Option.Option<ShiftMenu> => {
  if (key === "7" || key === "8")
    return Option.some({ _tag: "panel", tab: "catalog", mode: Option.none() });
  if (key === "9") return Option.some({ _tag: "setup" });
  return Option.map(Option.fromNullishOr(SHIFT_MODES[key]), (mode) => ({
    _tag: "panel" as const,
    tab: "mode" as const,
    mode: Option.some(mode),
  }));
};

export const DEVICE = { width: 340, height: 620 } as const;

export const deviceUnit = (width: number, height: number): number =>
  Math.min(
    1.3,
    Math.max(
      0.55,
      Math.min((width - 24) / DEVICE.width, (height - 24) / DEVICE.height),
    ),
  );
