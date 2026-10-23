import { useState } from "react";
import { fuzzyScore } from "./command-preview";

/**
 * The command centre block — a palette over a dimmed page, plus the
 * `@gpuixui/*` recipe a consumer copies.
 *
 * The panel is open in the preview. Its matcher reuses the command palette
 * preview's subsequence score, so "which rows a query keeps" is one rule in
 * this app rather than two; the highlight arithmetic and the line `Enter`
 * prints live in exported functions because a rendering cannot be typed into.
 */

export type CommandIcon =
  | "assign"
  | "assign-me"
  | "status"
  | "priority"
  | "estimate"
  | "label";

export interface CommandEntry {
  readonly id: string;
  readonly label: string;
  readonly icon: CommandIcon;
  /** The keycap or keycaps aligned right on the row. */
  readonly keys: ReadonlyArray<string>;
}

export const commandEntries: ReadonlyArray<CommandEntry> = [
  { id: "assign", label: "Assign to…", icon: "assign", keys: ["A"] },
  { id: "assign-me", label: "Assign to me", icon: "assign-me", keys: ["I"] },
  { id: "status", label: "Set status as…", icon: "status", keys: ["S"] },
  { id: "priority", label: "Prioritize…", icon: "priority", keys: ["P"] },
  {
    id: "estimate",
    label: "Change estimate to…",
    icon: "estimate",
    keys: ["⌘", "E"],
  },
  { id: "label", label: "Add label…", icon: "label", keys: ["L"] },
];

/** The row the panel opens on: the one a reader can see is highlighted. */
export const defaultCommand = "assign-me";

/** A query keeps the rows whose label it matches in order; blank keeps all. */
export const matchCommands = (query: string): ReadonlyArray<CommandEntry> =>
  query.trim() === ""
    ? commandEntries
    : commandEntries.filter(
        (entry) => fuzzyScore(query, entry.label) !== undefined,
      );

/** The highlight a query leaves behind: the current row if it survived. */
export const highlightFor = (
  rows: ReadonlyArray<CommandEntry>,
  current: string,
): string | undefined =>
  rows.some((row) => row.id === current) ? current : rows[0]?.id;

/** `delta` is `1` for ArrowDown and `-1` for ArrowUp; the ends wrap. */
export const moveHighlight = (
  rows: ReadonlyArray<CommandEntry>,
  current: string | undefined,
  delta: 1 | -1,
): string | undefined => {
  if (rows.length === 0) return undefined;
  const index = rows.findIndex((row) => row.id === current);
  const next =
    delta === 1
      ? (index + 1) % rows.length
      : index <= 0
        ? rows.length - 1
        : index - 1;
  return rows[next]?.id;
};

/** What `Enter` prints at the bottom of the panel. */
export const runLine = (entry: CommandEntry): string => `Ran: ${entry.label}`;

export interface CommandState {
  readonly query: string;
  readonly active: string;
  readonly ran: string | undefined;
}

export const initialCommandState: CommandState = {
  query: "",
  active: defaultCommand,
  ran: undefined,
};

/** Typing re-ranks the rows; a highlight that fell out of the list lands on the first. */
export const typeQuery = (
  state: CommandState,
  query: string,
): CommandState => ({
  ...state,
  query,
  active: highlightFor(matchCommands(query), state.active) ?? defaultCommand,
});

/**
 * The panel's key rules: arrows move the highlight, `Enter` runs the
 * highlighted row, `Escape` clears the query. Every other key is the field's.
 */
export const applyCommandKey = (
  state: CommandState,
  key: string,
): CommandState => {
  const rows = matchCommands(state.query);
  if (key === "ArrowDown" || key === "ArrowUp") {
    return {
      ...state,
      active:
        moveHighlight(
          rows,
          highlightFor(rows, state.active),
          key === "ArrowDown" ? 1 : -1,
        ) ?? state.active,
    };
  }
  if (key === "Enter") {
    const entry = rows.find(
      (row) => row.id === highlightFor(rows, state.active),
    );
    return entry === undefined ? state : { ...state, ran: runLine(entry) };
  }
  if (key === "Escape") return { ...initialCommandState };
  return state;
};

const paths: Readonly<Record<CommandIcon, string>> = {
  assign:
    "M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M6 8a3 3 0 1 0 6 0 3 3 0 1 0-6 0M18 9v6M15 12h6",
  "assign-me":
    "M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M6 8a3 3 0 1 0 6 0 3 3 0 1 0-6 0m8 5 2 2 4-4",
  status:
    "M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14m0 4.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5",
  priority: "M6 21V4m0 1h10l-2 3.5L16 12H6",
  estimate: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16m0 4v4l3 2",
  label: "M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9z",
};

const CommandGlyph = ({ name }: { readonly name: CommandIcon }) => (
  <svg
    aria-hidden="true"
    fill="none"
    height={14}
    viewBox="0 0 24 24"
    width={14}
  >
    <path d={paths[name]} stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

/** The page behind the palette: an app outline, dimmed and out of focus. */
const PageBehind = () => (
  <div aria-hidden="true" className="gx-cmd-page">
    <div className="gx-cmd-page-bar">
      <span className="gx-cmd-page-dot" />
      <span className="gx-cmd-page-line" data-span="short" />
      <span className="gx-cmd-page-line" data-span="tiny" />
    </div>
    <div className="gx-cmd-page-block">
      <span className="gx-cmd-page-line" data-span="medium" />
      <span className="gx-cmd-page-line" data-span="long" />
      <span className="gx-cmd-page-line" data-span="long" />
      <span className="gx-cmd-page-line" data-span="short" />
    </div>
    <div className="gx-cmd-page-block">
      <span className="gx-cmd-page-line" data-span="medium" />
      <span className="gx-cmd-page-line" data-span="long" />
      <span className="gx-cmd-page-line" data-span="short" />
    </div>
  </div>
);

export const CommandCentreRender = () => {
  const [state, setState] = useState<CommandState>(initialCommandState);

  const rows = matchCommands(state.query);
  const highlighted = highlightFor(rows, state.active);

  const run = (entry: CommandEntry) => {
    setState({
      ...state,
      active: entry.id,
      ran: runLine(entry),
    });
  };

  return (
    <div className="gx-cmd-scene">
      <PageBehind />
      <div className="gx-cmd-backdrop">
        <section aria-label="Command centre" className="gx-cmd-panel">
          <div className="gx-cmd-crumbs">
            <span className="gx-cmd-chip">Issue - LIN-1615 Changelog</span>
          </div>
          <div className="gx-cmd-field">
            <span
              aria-hidden="true"
              className="gx-cmd-caret"
              data-visible={state.query === ""}
            />
            <span className="gx-cmd-copy">
              {state.query === "" ? (
                <span aria-hidden="true" className="gx-cmd-ghost">
                  Type a command or search...
                </span>
              ) : null}
              <input
                aria-label="Type a command or search"
                className="gx-cmd-input"
                id="gx-command-search"
                name="command-search"
                onChange={(event) =>
                  setState(typeQuery(state, event.target.value))
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "ArrowDown" ||
                    event.key === "ArrowUp" ||
                    event.key === "Enter" ||
                    event.key === "Escape"
                  ) {
                    event.preventDefault();
                  }
                  setState(applyCommandKey(state, event.key));
                }}
                value={state.query}
              />
            </span>
          </div>
          <div className="gx-cmd-list">
            {rows.length === 0 ? (
              <p className="gx-cmd-empty">No commands match “{state.query}”.</p>
            ) : (
              rows.map((entry) => (
                <button
                  aria-current={entry.id === highlighted ? "true" : undefined}
                  className="gx-cmd-row"
                  data-highlighted={entry.id === highlighted}
                  key={entry.id}
                  onClick={() => run(entry)}
                  type="button"
                >
                  <span className="gx-cmd-icon">
                    <CommandGlyph name={entry.icon} />
                  </span>
                  <span className="gx-cmd-label">{entry.label}</span>
                  <span className="gx-cmd-keys">
                    {entry.keys.map((key) => (
                      <kbd className="gx-keycap" key={key}>
                        {key}
                      </kbd>
                    ))}
                  </span>
                </button>
              ))
            )}
          </div>
          <p aria-live="polite" className="gx-cmd-foot">
            {state.ran ?? ""}
          </p>
        </section>
      </div>
    </div>
  );
};

export const commandCentreSource = `import { useState } from "react";
import { CommandMenu, CommandMenuInput, CommandMenuList } from "@gpuixui/components/command-menu";
import { Badge } from "@gpuixui/components/badge";
import { Stack, Text } from "@gpuixui/primitives";

interface CommandCentreProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

const rows = [
  { id: "assign", label: "Assign to…", shortcut: "A" },
  { id: "assign-me", label: "Assign to me", shortcut: "I" },
  { id: "status", label: "Set status as…", shortcut: "S" },
  { id: "priority", label: "Prioritize…", shortcut: "P" },
  { id: "estimate", label: "Change estimate to…", shortcut: "⌘E" },
  { id: "label", label: "Add label…", shortcut: "L" },
];

export function CommandCentre({ open, onOpenChange }: CommandCentreProps) {
  const [ran, setRan] = useState<string | undefined>(undefined);

  return (
    <CommandMenu
      open={open}
      onOpenChange={onOpenChange}
      actions={rows.map((row) => ({
        ...row,
        perform: () => setRan(\`Ran: \${row.label}\`),
      }))}
    >
      <Stack direction="column" gap="sm" style={{ width: 560 }}>
        <Badge variant="outline">Issue - LIN-1615 Changelog</Badge>
        <CommandMenuInput placeholder="Type a command or search..." />
        <CommandMenuList />
        {ran === undefined ? null : (
          <Text role="caption" tone="muted">{ran}</Text>
        )}
      </Stack>
    </CommandMenu>
  );
}`;
