/**
 * CommandMenu: a searchable action list inside the dialog.
 *
 * This composes the parts rather than reinventing them: `Dialog` owns the modal
 * surface and Escape, `<input>` (the `@gpuixui/primitives` stand-in) owns typing,
 * and `menu/logic.ts` owns which row is active. The active row is **highlighted,
 * not focused** — the input must keep focus or typing would stop after the first
 * arrow key. `Tab`/`Escape` follow the dialog; Enter runs the active action.
 *
 * No fuzzy scoring in v1: the default filter is a case-insensitive substring on
 * the label. `filter` is the extension point.
 */

import type { EventPayload, PublicInstance } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { Fragment, useRef, useState } from "react";
import { isDismiss, isDown, isFirst, isLast, isUp } from "./internal/key.js";
import { controlHeight, textStyle, useTheme } from "./internal/theme.js";
import { Dialog, DialogContent } from "./dialog.js";
import { dismissTopLayer } from "./internal/dismiss-layer.js";
import { MenuLabel, menuRowStyle } from "./menu/item.js";
import { move, type MenuAction, type MenuState } from "./menu/logic.js";

/** One runnable command. */
export interface CommandAction {
  readonly id: string;
  readonly label: string;
  /** The heading this action sits under; consecutive actions share it. */
  readonly group?: string;
  /** Display only, e.g. `"⌘S"`. The component binds no shortcuts. */
  readonly shortcut?: string;
  /** Visible but not runnable. */
  readonly disabled?: boolean;
  readonly perform: () => void;
}

/** {@link CommandMenu} props. */
export interface CommandMenuProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly actions: ReadonlyArray<CommandAction>;
  /** Default `"Type a command…"`. */
  readonly placeholder?: string;
  /** Default `"No matching commands"`. */
  readonly emptyLabel?: string;
  /** Replace the default case-insensitive substring match. */
  readonly filter?: (action: CommandAction, query: string) => boolean;
}

const normalise = (value: string): string => Str.toLowerCase(Str.trim(value));

const defaultFilter = (action: CommandAction, query: string): boolean =>
  Str.includes(normalise(query))(normalise(action.label));

/** The specs `menu/logic.ts` navigates over: filtered position and disabled. */
const specs = (actions: ReadonlyArray<CommandAction>) =>
  Arr.map(actions, (action, index) => ({
    id: index,
    disabled: action.disabled === true,
  }));

/** The enabled index to start on, or `None` when every match is disabled. */
const firstEnabled = (
  actions: ReadonlyArray<CommandAction>,
): Option.Option<number> =>
  Arr.findFirstIndex(actions, (action) => action.disabled !== true);

/**
 * The searchable palette. Controlled: the app owns `open`, because the command
 * menu is usually opened by an application shortcut rather than by a control.
 */
export const CommandMenu = ({
  open,
  onOpenChange,
  actions,
  placeholder = "Type a command…",
  emptyLabel = "No matching commands",
  filter,
}: CommandMenuProps) => {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<Option.Option<number>>(
    Option.none(),
  );
  const input = useRef<PublicInstance | null>(null);

  const matches = Arr.filter(actions, (action) =>
    (filter ?? defaultFilter)(action, query),
  );
  const rows = specs(matches);

  // The stored index may point at a filtered-out row after typing. Fall back to
  // the first enabled match instead of highlighting nothing.
  const active: Option.Option<number> = Option.orElse(
    Option.filter(activeId, (id) =>
      Option.exists(Arr.get(rows, id), (row) => !row.disabled),
    ),
    () => firstEnabled(matches),
  );

  const close = (): void => {
    setQuery("");
    setActiveId(Option.none());
    onOpenChange(false);
  };

  const run = (action: CommandAction): void => {
    if (action.disabled === true) return;
    action.perform();
    close();
  };

  const runIndex = (index: Option.Option<number>): void => {
    Option.match(index, {
      onNone: () => undefined,
      onSome: (at) => {
        Option.match(Arr.get(matches, at), {
          onNone: () => undefined,
          onSome: run,
        });
      },
    });
  };

  const step = (state: MenuState, action: MenuAction): void => {
    setActiveId(move(state, rows, action).activeId);
  };

  const handleKeyDown = (event: EventPayload): void => {
    const state: MenuState = { activeId: active };
    if (isDown(event)) step(state, { _tag: "Move", delta: 1 });
    else if (isUp(event)) step(state, { _tag: "Move", delta: -1 });
    else if (isFirst(event)) step(state, { _tag: "First" });
    else if (isLast(event)) step(state, { _tag: "Last" });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <DialogContent
        size="md"
        label="Command menu"
        showClose={false}
        testId="command-menu"
        initialFocus={() => input.current?.id ?? null}
        style={{ gap: theme.spacing.md }}
      >
        <input
          ref={(instance) => {
            input.current = instance;
          }}
          testId="command-input"
          aria-label="Search commands"
          placeholder={placeholder}
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.value ?? "");
            setActiveId(Option.none());
          }}
          onSubmit={() => runIndex(active)}
          onKeyDown={(event) => {
            if (isDismiss(event)) {
              dismissTopLayer(event);
              return;
            }
            handleKeyDown(event);
          }}
          style={{
            ...textStyle(theme, "body"),
            height: controlHeight(theme, "md"),
            paddingLeft: theme.spacing.md,
            paddingRight: theme.spacing.md,
            backgroundColor: theme.colors.input,
            color: theme.colors.inputForeground,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing["2xs"],
            maxHeight: 320,
            overflow: "scroll",
          }}
        >
          {matches.length === 0 ? (
            <text
              testId="command-empty"
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.mutedForeground,
                paddingTop: theme.spacing.lg,
                paddingBottom: theme.spacing.lg,
              }}
            >
              {emptyLabel}
            </text>
          ) : null}
          {Arr.map(matches, (action, index) => {
            const previous =
              index === 0 ? Option.none() : Arr.get(matches, index - 1);
            const newGroup =
              action.group !== undefined &&
              !Option.exists(previous, (entry) => entry.group === action.group);
            return (
              <Fragment key={action.id}>
                {newGroup ? <MenuLabel>{action.group}</MenuLabel> : null}
                <div
                  role="option"
                  aria-selected={Option.contains(active, index)}
                  testId={`command-${action.id}`}
                  onClick={() => run(action)}
                  style={menuRowStyle(
                    theme,
                    "default",
                    Option.contains(active, index),
                    action.disabled === true,
                  )}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      flexGrow: 1,
                      minWidth: 0,
                    }}
                  >
                    {action.label}
                  </div>
                  {action.shortcut === undefined ? null : (
                    <text
                      style={{
                        ...textStyle(theme, "caption"),
                        color: theme.colors.mutedForeground,
                      }}
                    >
                      {action.shortcut}
                    </text>
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          ↑↓ to navigate · ↵ to run · esc to close
        </text>
      </DialogContent>
    </Dialog>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const commandMenuMeta = {
  name: "Command menus",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no fuzzy scoring in v1: the default filter is a case-insensitive substring; pass filter for anything else",
    "the input is the GPUix <input> host element until @gpuixui/primitives lands",
    "the active row is highlighted, not focused, so typing keeps working; screen readers get aria-selected but no aria-activedescendant",
  ],
  docs: "docs/command-menu.mdx",
  example: "examples/command-menu.example.tsx",
  testFile: "src/behaviour/command-menu.test.tsx",
} as const;
