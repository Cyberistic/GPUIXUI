/**
 * CommandMenu: a searchable action list inside the dialog.
 *
 * This composes the parts rather than reinventing them: `Dialog` owns the modal
 * surface and Escape, the palette's own `<input>` owns typing,
 * and `menu/logic.ts` owns which row is active. The active row is **highlighted,
 * not focused** — the input must keep focus or typing would stop after the first
 * arrow key. `Tab`/`Escape` follow the dialog; Enter runs the active action.
 *
 * No custom scoring is required: the default filter is a case-insensitive
 * subsequence match, ranked within each group so a group's heading never
 * repeats. `filter` replaces it with a boolean predicate.
 *
 * The root owns the query and the matches because ranking needs the whole action
 * set; the parts are the input, the list, one row and the empty state.
 */

import type {
  EventPayload,
  Props,
  PublicInstance,
  StyleDesc,
} from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import {
  COMMAND_EMPTY,
  COMMAND_HINT,
  COMMAND_INPUT,
  COMMAND_LIST,
  COMMAND_SHORTCUT,
} from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import {
  createContext,
  Fragment,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Dialog, DialogContent } from "./dialog.js";
import { dismissTopLayer } from "./internal/dismiss-layer.js";
import {
  fieldHelp,
  fieldHint,
  hintHost,
  renderFieldHint,
} from "@gpuixui/primitives/hint";
import { isDismiss, isDown, isFirst, isLast, isUp } from "./internal/key.js";
import { overlaySurfaceStyle } from "./internal/overlay.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import {
  controlHeight,
  controlRing,
  keepContent,
  nativeTextTheme,
  selectionWash,
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
  /**
   * Action ids, most recently used first. With an empty query and the default
   * filter they are shown under one "Recent" heading, in this order; a typed
   * query keeps the normal ranking.
   */
  readonly recents?: ReadonlyArray<string>;
  /** Replace the default ranked fuzzy match; accepted rows keep declaration order. */
  readonly filter?: (action: CommandAction, query: string) => boolean;
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

/**
 * The empty-query list: the caller's recent ids first, one heading, and the rest
 * in declaration order. Unknown and repeated ids are dropped, so a stale
 * recents list cannot duplicate or invent a row.
 */
const withRecents = (
  actions: ReadonlyArray<CommandAction>,
  recents: ReadonlyArray<string>,
): ReadonlyArray<CommandAction> => {
  const ids = HashSet.fromIterable(recents);
  const recent = Arr.flatMap(Arr.dedupe(recents), (id) =>
    Option.match(
      Arr.findFirst(actions, (action) => action.id === id),
      { onNone: () => [], onSome: (action) => [action] },
    ),
  );
  if (Arr.isReadonlyArrayEmpty(recent)) return actions;
  return Arr.appendAll(
    Arr.map(recent, (action) => ({ ...action, group: "Recent" })),
    Arr.filter(actions, (action) => !HashSet.has(ids, action.id)),
  );
};

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
  recents,
  filter,
  children,
}: CommandMenuProps) => {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<Option.Option<number>>(
    Option.none(),
  );
  const input = useRef<PublicInstance | null>(null);

  const recent =
    Str.isEmpty(Str.trim(query)) && recents !== undefined
      ? withRecents(actions, recents)
      : undefined;
  const matches =
    filter !== undefined
      ? Arr.filter(actions, (action) => filter(action, query))
      : (recent ?? defaultMatches(actions, query));
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
    else if (isFirst(event)) step({ _tag: "First" });
    else if (isLast(event)) step({ _tag: "Last" });
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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/**
 * The search field: it keeps focus while the highlight moves. Enter runs the
 * active action; Escape is offered to the topmost dismiss layer.
 *
 * Focused by the dialog's `initialFocus`, never by `autoFocus`: a field that
 * focuses itself first becomes the modal's restore target, and the opener loses
 * the focus when the palette closes.
 */
export const CommandMenuInput = ({
  placeholder = "Type a command…",
  label = "Search commands",
  className,
}: CommandMenuInputProps) => {
  const theme = useTheme();
  const { query, setQuery, runActive, handleKeyDown, registerInput } =
    useCommandMenu();

  const fieldStyle: StyleDesc = {
    ...overlaySurfaceStyle(COMMAND_INPUT, className, theme),
    height: controlHeight(theme, "md"),
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.md,
    backgroundColor: theme.colors.input,
    color: theme.colors.inputForeground,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    ...controlRing(theme),
    ...selectionWash(theme),
    ...keepContent,
  };
  const hint = fieldHint({ placeholder }, theme, query, {
    origin: "host",
    align: "center",
    style: fieldStyle,
  });

  return (
    <div style={hintHost()}>
      <input
        ref={registerInput}
        testId="command-input"
        aria-label={label}
        // The hint is painted, so the runtime's `aria_placeholder` left with
        // the prop; the empty field announces the same words as help.
        aria-description={fieldHelp({ placeholder }, query)}
        // The palette's field paints the `input` role as its own fill; its hint
        // is painted, because the host's own placeholder is a fixed grey.
        theme={nativeTextTheme(theme, "input")}
        value={query}
        onChange={(event) => setQuery(event.value ?? "")}
        onSubmit={runActive}
        onKeyDown={handleKeyDown}
        style={fieldStyle}
      />
      {Option.match(hint, {
        onNone: () => null,
        onSome: (painted) => renderFieldHint(painted, "command-input"),
      })}
    </div>
  );
};

/** {@link CommandMenuList} props. */
export interface CommandMenuListProps extends Omit<Props, "children"> {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/**
 * The match column: a heading at each group change, the rows, and the key hint.
 * The hint belongs to the list because it describes the list's keys; a custom
 * list drops it.
 */
export const CommandMenuList = ({
  className,
  style,
  ...rest
}: CommandMenuListProps) => {
  const theme = useTheme();
  const { matches } = useCommandMenu();

  return (
    <div
      {...rest}
      style={mergeStyles(
        overlaySurfaceStyle(COMMAND_LIST, className, theme),
        style,
      )}
    >
      <div
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
      <text style={overlaySurfaceStyle(COMMAND_HINT, undefined, theme)}>
        ↑↓ to navigate · ↵ to run · esc to close
      </text>
    </div>
  );
};

/** {@link CommandMenuItem} props. */
export interface CommandMenuItemProps extends Omit<Props, "children"> {
  readonly action: CommandAction;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** One runnable row: highlighted from the root, never focused. */
export const CommandMenuItem = ({
  action,
  className,
  style,
  ...rest
}: CommandMenuItemProps) => {
  const theme = useTheme();
  const { isActive, run } = useCommandMenu();
  const highlighted = isActive(action);

  return (
    <div
      role="option"
      aria-selected={highlighted}
      testId={`command-${action.id}`}
      onClick={() => run(action)}
      {...rest}
      style={mergeStyles(
        menuRowStyle(
          theme,
          "default",
          highlighted,
          action.disabled === true,
          className,
        ),
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
        <text style={overlaySurfaceStyle(COMMAND_SHORTCUT, undefined, theme)}>
          {action.shortcut}
        </text>
      )}
    </div>
  );
};

/** {@link CommandMenuEmpty} props. */
export interface CommandMenuEmptyProps {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: ReactNode;
}

/** The empty state. It renders only while no action matches the query. */
export const CommandMenuEmpty = ({
  className,
  children,
}: CommandMenuEmptyProps) => {
  const theme = useTheme();
  const { matches } = useCommandMenu();
  if (matches.length > 0) return null;

  return (
    <text
      testId="command-empty"
      style={overlaySurfaceStyle(COMMAND_EMPTY, className, theme)}
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
  limitations: [
    "ranking is per group, not global, so a group's heading never repeats; a custom filter opts out and keeps declaration order",
    "recents are caller-owned data (`recents` action ids) shown only for an empty query with the default filter; the component records nothing itself",
    "the input is a GPUix <input> painted by this palette's fixed recipe; @gpuixui/primitives' Input paints its own density-scaled chrome (ADR 0006), so it is not adopted here",
    "the active row is highlighted, not focused, so typing keeps working; screen readers get aria-selected but no aria-activedescendant",
  ],
  docs: "docs/command-menu.mdx",
  example: "examples/command-menu.example.tsx",
  testFile: "src/behaviour/command-menu.test.tsx",
} as const;
