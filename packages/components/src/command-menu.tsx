/** @jsxImportSource @gpuix/react */
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
import { presenceTabStop } from "./internal/presence.js";
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
import { commandListOf, recentIdsOf } from "./menu/fuzzy.js";
import { MenuLabel, menuRowStyle } from "./menu/item.js";
import { fuzzyMatches, rankByGroup } from "./menu/fuzzy.js";
import {
  move,
  type MenuAction,
  type MenuItemSpec,
  type MenuState,
} from "./menu/logic.js";

export interface CommandAction {
  readonly id: string;
  readonly label: string;

  readonly group?: string;

  readonly shortcut?: string;

  readonly disabled?: boolean;
  readonly perform: () => void;
}

interface CommandMenuContextValue {
  readonly query: string;

  readonly setQuery: (query: string) => void;
  readonly matches: ReadonlyArray<CommandAction>;
  readonly isActive: (action: CommandAction) => boolean;
  readonly run: (action: CommandAction) => void;
  readonly runActive: () => void;
  readonly handleKeyDown: (event: EventPayload) => void;
  readonly registerInput: (instance: PublicInstance | null) => void;

  readonly present: boolean;
}

const CommandMenuContext = createContext<CommandMenuContextValue | undefined>(
  undefined,
);

const useCommandMenu = (): CommandMenuContextValue => {
  const value = useContext(CommandMenuContext);
  if (value === undefined) {
    throw new Error("CommandMenu parts must be used inside CommandMenu");
  }
  return value;
};

export interface CommandMenuProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;

  readonly actions: ReadonlyArray<CommandAction>;

  readonly recents?: ReadonlyArray<string>;

  readonly filter?: (action: CommandAction, query: string) => boolean;
  readonly children?: PartChildren;
}

const defaultMatches = (
  actions: ReadonlyArray<CommandAction>,
  query: string,
): ReadonlyArray<CommandAction> =>
  rankByGroup(
    fuzzyMatches(actions, query, (action) => action.label),
    (action) => action.group,
  );

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

const specs = (
  actions: ReadonlyArray<CommandAction>,
): ReadonlyArray<MenuItemSpec> =>
  Arr.map(actions, (action, index) => ({
    id: index,
    disabled: action.disabled === true,
    label: action.label,
  }));

const firstEnabled = (
  actions: ReadonlyArray<CommandAction>,
): Option.Option<number> =>
  Arr.findFirstIndex(actions, (action) => action.disabled !== true);

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

  const commands = commandListOf(actions);
  const recentIds = recentIdsOf(recents);
  const recent =
    Str.isEmpty(Str.trim(query)) && recentIds.length > 0
      ? withRecents(commands, recentIds)
      : undefined;
  const matches =
    filter !== undefined
      ? Arr.filter(commands, (action) => filter(action, query))
      : (recent ?? defaultMatches(commands, query));
  const rows = specs(matches);

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
        present: open,
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

export interface CommandMenuInputProps {
  readonly placeholder?: string;

  readonly label?: string;

  readonly className?: string;
}

export const CommandMenuInput = ({
  placeholder = "Type a command…",
  label = "Search commands",
  className,
}: CommandMenuInputProps) => {
  const theme = useTheme();
  const { query, setQuery, runActive, handleKeyDown, registerInput, present } =
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
        {...presenceTabStop(present)}
        aria-description={fieldHelp({ placeholder }, query)}
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

export interface CommandMenuListProps extends Omit<Props, "children"> {
  readonly className?: string;
}

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

export interface CommandMenuItemProps extends Omit<Props, "children"> {
  readonly action: CommandAction;

  readonly className?: string;
}

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
          {
            tone: "default",
            active: highlighted,
            disabled: action.disabled === true,
          },
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

export interface CommandMenuEmptyProps {
  readonly className?: string;
  readonly children?: ReactNode;
}

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
