/**
 * CommandMenu: a searchable action list inside the dialog.
 *
 * This composes the parts rather than reinventing them: `Dialog` owns the modal
 * surface and Escape, `<input>` (the `@gpuixui/primitives` stand-in) owns typing,
 * and `menu/logic.ts` owns which row is active. The active row is **highlighted,
 * not focused** — the input must keep focus or typing would stop after the first
 * arrow key. `Tab`/`Escape` follow the dialog; Enter runs the active action.
 *
 * No custom scoring is required: the default filter is a case-insensitive
 * subsequence match, ranked within each group so a group's heading never
 * repeats. `filter` replaces it with a boolean predicate.
 *
 * The root owns the query and the matches because ranking needs the whole action
 * set; the parts are the input, the list, one row and the empty state. Running
 * a command records it for the empty-query "Recent" group (`command-menu/logic`),
 * which is component state unless the caller supplies `recent`.
 */

import type { EventPayload, Props, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  orderWithRecent,
  recordRecent,
  type CommandAction,
} from "./command-menu/logic.js";
import { Dialog, DialogContent } from "./dialog.js";
import { useControllableState } from "./internal/controllable.js";
import { dismissTopLayer } from "./internal/dismiss-layer.js";
import { useFocusState } from "./internal/focus.js";
import { isDismiss, isDown, isUp } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import {
  controlHeight,
  focusRing,
  textStyle,
  useTheme,
} from "./internal/theme.js";
import { MenuLabel, menuRowStyle } from "./menu/item.js";
import { fuzzyMatches, rankByGroup } from "./menu/fuzzy.js";
import {
  move,
  type MenuAction,
  type MenuItemSpec,
  type MenuState,
} from "./menu/logic.js";

export type { CommandAction } from "./command-menu/logic.js";

/** The rules a command-menu part follows; throws outside a {@link CommandMenu}. */
interface CommandMenuContextValue {
  readonly query: string;
  /** Set the query and reset the highlight to the first enabled match. */
  readonly setQuery: (query: string) => void;
  readonly matches: ReadonlyArray<CommandAction>;
  readonly isActive: (action: CommandAction) => boolean;
  readonly run: (action: CommandAction) => void;
  readonly runActive: () => void;
  readonly handleKeyDown: (event: EventPayload) => void;
  readonly registerInput: (instance: PublicInstance | null) => void;
}

const CommandMenuContext = createContext<CommandMenuContextValue | undefined>(
  undefined,
);

/** The palette a part belongs to. Throws when there is none. */
const useCommandMenu = (): CommandMenuContextValue => {
  const value = useContext(CommandMenuContext);
  if (value === undefined) {
    throw new Error("CommandMenu parts must be used inside CommandMenu");
  }
  return value;
};

/** {@link CommandMenu} props. */
export interface CommandMenuProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly actions: ReadonlyArray<CommandAction>;
  /** Replace the default ranked fuzzy match; accepted rows keep declaration order. */
  readonly filter?: (action: CommandAction, query: string) => boolean;
  /** The controlled recent-command ids, most recent first. */
  readonly recent?: ReadonlyArray<string>;
  /** The uncontrolled starting list. `/dev/null` by default. */
  readonly defaultRecent?: ReadonlyArray<string>;
  /** Called with the next list after an enabled command runs. */
  readonly onRecentChange?: (recent: ReadonlyArray<string>) => void;
  /** How many recent commands are kept. Default `5`, minimum `1`. */
  readonly recentLimit?: number;
  /** The heading over the recent group. Default `"Recent"`. */
  readonly recentLabel?: string;
  readonly children?: PartChildren;
}

/** The default: rank a subsequence match within each declared group. */
const defaultMatches = (
  actions: ReadonlyArray<CommandAction>,
  query: string,
): ReadonlyArray<CommandAction> =>
  rankByGroup(
    fuzzyMatches(actions, query, (action) => action.label),
    (action) => action.group,
  );

/** The specs `menu/logic.ts` navigates over: filtered position and disabled. */
const specs = (
  actions: ReadonlyArray<CommandAction>,
): ReadonlyArray<MenuItemSpec> =>
  Arr.map(actions, (action, index) => ({
    id: index,
    disabled: action.disabled === true,
    label: action.label,
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
  filter,
  recent: recentProp,
  defaultRecent,
  onRecentChange,
  recentLimit = 5,
  recentLabel = "Recent",
  children,
}: CommandMenuProps) => {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<Option.Option<number>>(
    Option.none(),
  );
  const input = useRef<PublicInstance | null>(null);
  const [recent, setRecent] = useControllableState<ReadonlyArray<string>>({
    value: recentProp,
    defaultValue: defaultRecent ?? [],
    onChange: onRecentChange,
  });

  const matches = Str.isEmpty(Str.trim(query))
    ? orderWithRecent(actions, recent, recentLabel)
    : filter === undefined
      ? defaultMatches(actions, query)
      : Arr.filter(actions, (action) => filter(action, query));
  const rows = specs(matches);

  // The stored index may point at a filtered-out row after typing. Fall back to
  // the first enabled match instead of highlighting nothing.
  const active: Option.Option<number> = Option.orElse(
    Option.filter(activeId, (id) =>
      Option.exists(Arr.get(rows, id), (row) => !row.disabled),
    ),
    () => firstEnabled(matches),
  );
  const activeAction = Option.flatMap(active, (index) =>
    Arr.get(matches, index),
  );

  const close = (): void => {
    setQuery("");
    setActiveId(Option.none());
    onOpenChange(false);
  };

  const run = (action: CommandAction): void => {
    if (action.disabled === true) return;
    action.perform();
    setRecent(recordRecent(recent, action.id, recentLimit));
    close();
  };

  const runActive = (): void => {
    Option.match(activeAction, {
      onNone: () => undefined,
      onSome: run,
    });
  };

  const writeQuery = (next: string): void => {
    setQuery(next);
    setActiveId(Option.none());
  };

  const step = (action: MenuAction): void => {
    const state: MenuState = { activeId: active };
    setActiveId(move(state, rows, action).activeId);
  };

  const handleKeyDown = (event: EventPayload): void => {
    if (isDismiss(event)) {
      dismissTopLayer(event);
      return;
    }
    if (isDown(event)) step({ _tag: "Move", delta: 1 });
    else if (isUp(event)) step({ _tag: "Move", delta: -1 });
  };

  assertParts(commandMenuRoot, children);

  return (
    <CommandMenuContext.Provider
      value={{
        query,
        setQuery: writeQuery,
        matches,
        isActive: (action) =>
          Option.exists(activeAction, (current) => current.id === action.id),
        run,
        runActive,
        handleKeyDown,
        registerInput: (instance) => {
          input.current = instance;
        },
      }}
    >
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
          {children}
        </DialogContent>
      </Dialog>
    </CommandMenuContext.Provider>
  );
};

/** {@link CommandMenuInput} props. */
export interface CommandMenuInputProps {
  /** Default `"Type a command…"`. */
  readonly placeholder?: string;
  /** The field's accessible name. Default `"Search commands"`. */
  readonly label?: string;
}

/**
 * The search field: it keeps focus while the highlight moves. Enter runs the
 * active action; Escape is offered to the topmost dismiss layer.
 */
export const CommandMenuInput = ({
  placeholder = "Type a command…",
  label = "Search commands",
}: CommandMenuInputProps) => {
  const theme = useTheme();
  const { query, setQuery, runActive, handleKeyDown, registerInput } =
    useCommandMenu();
  // The dialog focuses this field through `initialFocus` after recording the
  // opener; an `autoFocus` here would claim focus first and break the restore
  // (plan 589). The runtime focuses after React's effects, so `onFocus` never
  // runs on mount: the ring is seeded from the open state until the sample names
  // the field, then follows the renderer's focused host (plans 388, 523, 755).
  const [instance, setInstance] = useState<PublicInstance | undefined>(
    undefined,
  );
  const attach = useCallback(
    (next: PublicInstance | null) => {
      setInstance(next ?? undefined);
      registerInput(next);
    },
    [registerInput],
  );
  const [focused] = useFocusState(true, false, instance?.id);

  return (
    <input
      ref={attach}
      testId="command-input"
      aria-label={label}
      placeholder={placeholder}
      value={query}
      onChange={(event) => setQuery(event.value ?? "")}
      onSubmit={runActive}
      onKeyDown={handleKeyDown}
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
        ...(focused ? focusRing(theme) : {}),
      }}
    />
  );
};

/** {@link CommandMenuList} props. */
export type CommandMenuListProps = Omit<Props, "children">;

/**
 * The match column: a heading at each group change, the rows, and the key hint.
 * The hint belongs to the list because it describes the list's keys; a custom
 * list drops it.
 */
export const CommandMenuList = ({ style, ...rest }: CommandMenuListProps) => {
  const theme = useTheme();
  const { matches } = useCommandMenu();

  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.md,
        },
        style,
      )}
    >
      <div
        testId="command-list"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing["2xs"],
          maxHeight: 320,
          overflow: "scroll",
        }}
      >
        {Arr.map(matches, (action, index) => {
          const previous =
            index === 0 ? Option.none() : Arr.get(matches, index - 1);
          const newGroup =
            action.group !== undefined &&
            !Option.exists(previous, (entry) => entry.group === action.group);
          return (
            <Fragment key={action.id}>
              {newGroup ? <MenuLabel>{action.group}</MenuLabel> : null}
              <CommandMenuItem action={action} />
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
    </div>
  );
};

/** {@link CommandMenuItem} props. */
export interface CommandMenuItemProps extends Omit<Props, "children"> {
  readonly action: CommandAction;
}

/** One runnable row: highlighted from the root, never focused. */
export const CommandMenuItem = ({
  action,
  style,
  onClick,
  ...rest
}: CommandMenuItemProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const { isActive, run } = useCommandMenu();
  const highlighted = isActive(action);
  const [instance, setInstance] = useState<Option.Option<PublicInstance>>(
    Option.none(),
  );
  const setRow = useCallback(
    (next: PublicInstance | null) => setInstance(Option.fromNullishOr(next)),
    [],
  );

  // The list scrolls; without this the highlight walks out of the viewport and
  // Enter runs a row the user cannot see. The renderer scrolls to the nearest
  // scroll parent's direct child, which is this row (plan 530).
  useLayoutEffect(() => {
    if (!highlighted) return;
    Option.match(instance, {
      onNone: () => undefined,
      onSome: (element) => renderer?.scrollIntoView?.(element.id),
    });
  }, [highlighted, instance, renderer]);

  return (
    <div
      role="option"
      aria-selected={highlighted}
      testId={`command-${action.id}`}
      ref={setRow}
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        run(action);
      }}
      style={mergeStyles(
        menuRowStyle(theme, "default", highlighted, action.disabled === true),
        style,
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
  );
};

/** {@link CommandMenuEmpty} props. */
export interface CommandMenuEmptyProps {
  readonly children?: ReactNode;
}

/** The empty state. It renders only while no action matches the query. */
export const CommandMenuEmpty = ({ children }: CommandMenuEmptyProps) => {
  const theme = useTheme();
  const { matches } = useCommandMenu();
  if (matches.length > 0) return null;

  return (
    <text
      testId="command-empty"
      style={{
        ...textStyle(theme, "body"),
        color: theme.colors.mutedForeground,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.lg,
      }}
    >
      {children ?? "No matching commands"}
    </text>
  );
};

/** Every part of CommandMenu, so a misplaced sibling is named. */
const commandMenuParts: ReadonlyArray<PartComponent> = [
  CommandMenu,
  CommandMenuInput,
  CommandMenuList,
  CommandMenuItem,
  CommandMenuEmpty,
];

const commandMenuRoot: PartsContract = {
  parent: "CommandMenu",
  family: commandMenuParts,
  accepts: [CommandMenuInput, CommandMenuList, CommandMenuEmpty],
  hint: "Put the input, list and empty state directly inside CommandMenu.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const commandMenuMeta = {
  name: "Command menus",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  focusable: true,
  limitations: [
    "ranking is per group, not global, so a group's heading never repeats; a custom filter opts out and keeps declaration order",
    "the input is the GPUix <input> host element: primitives' Input reads a second theme context, so adoption waits on one provider",
    "the active row is highlighted, not focused, so typing keeps working; screen readers get aria-selected but no aria-activedescendant",
  ],
  docs: "docs/command-menu.mdx",
  example: "examples/command-menu.example.tsx",
  testFile: "src/behaviour/command-menu.test.tsx",
} as const;
