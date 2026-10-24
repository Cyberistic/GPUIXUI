/** @jsxImportSource @gpuix/react */
/**
 * MentionInput: `@name` autocompletion in a text field.
 *
 * The token rules (where a query starts, how names rank, what replaces the
 * token) live in `mention/logic.ts`. 0.11.0 has no caret position, so the query
 * comes from the text's last `@` token — correct while typing at the end, and
 * documented as the limitation it is.
 *
 * The list filters and ranks the `MentionInputItem`s the consumer declares, so
 * the candidate set stays the consumer's data and the ranking stays ours.
 */

import type { EventPayload, InputProps, Props } from "@gpuix/react";
import {
  FloatingLayer,
  floatingRootStyle,
  mergeStyles,
} from "@gpuix/react/floating";
import {
  cn,
  MENTION_INPUT_CONTROL,
  MENTION_INPUT_FIELD,
  MENTION_INPUT_ITEM,
  MENTION_INPUT_ITEM_TEXT,
  MENTION_INPUT_LIST,
} from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { useControllableState } from "./internal/controllable.js";
import {
  fieldHelp,
  fieldHint,
  hintHost,
  renderFieldHint,
} from "@gpuixui/primitives/hint";
import { activationHandlers, isDismiss, isDown, isUp } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import {
  fadeFromAnchor,
  PresenceShield,
  presenceMotion,
  presenceStyle,
  useSurfacePresence,
  useSurfaceTiming,
} from "./internal/presence.js";
import {
  applyMention,
  mentionMaxVisible,
  mentionQuery,
  rankMentions,
  type MentionQuery,
} from "./mention/logic.js";
import { recipeStyle } from "./internal/recipe.js";
import {
  controlHeight,
  disabledFade,
  keepContent,
  keyboardRing,
  nativeTextTheme,
  selectionWash,
  useTheme,
} from "./internal/theme.js";

/** The rules a mention part follows; throws outside a {@link MentionInput}. */
interface MentionContextValue {
  readonly text: string;
  readonly query: Option.Option<MentionQuery>;
  readonly highlighted: number;
  readonly maxVisible: number;
  /** The field refuses every edit, so its list is gone rather than leaving. */
  readonly disabled: boolean;
  readonly select: (value: string) => void;
  readonly close: () => void;
  readonly reportVisible: (values: ReadonlyArray<string>) => void;
}

const MentionContext = createContext<MentionContextValue | undefined>(
  undefined,
);

/**
 * Whether the row is the highlighted one, set by the list.
 *
 * `leaving` marks a row painted only for the list's exit: the runtime decides the
 * Tab order element by element, so a row that cannot be pressed must not be a
 * stop either.
 */
const MentionItemContext = createContext<{
  readonly highlighted: boolean;
  readonly leaving: boolean;
}>({ highlighted: false, leaving: false });

/** The mention field a part belongs to. Throws when there is none. */
const useMention = (): MentionContextValue => {
  const value = useContext(MentionContext);
  if (value === undefined) {
    throw new Error("MentionInput parts must be used inside MentionInput");
  }
  return value;
};

/** {@link MentionInput} props. */
export interface MentionInputProps extends Omit<
  InputProps,
  "value" | "style" | "onChange" | "onSubmit"
> {
  /** The controlled text. `undefined` means uncontrolled. */
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;
  /** The inserted name, once per accepted mention. */
  readonly onMention?: (value: string) => void;
  /** The field's accessible name. */
  readonly label: string;
  /** Rows offered at once. Default `6`. */
  readonly maxVisible?: number;
  readonly disabled?: boolean;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

const sameValues = (
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>,
): boolean =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

/** The field: value, active query, highlight and the field surface. */
export const MentionInput = ({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  onMention,
  label,
  maxVisible = mentionMaxVisible,
  disabled = false,
  className,
  children,
  placeholder,
  testId,
  ...rest
}: MentionInputProps) => {
  const theme = useTheme();
  const [text, setText] = useControllableState({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  const [dismissed, setDismissed] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [visible, setVisible] = useState<ReadonlyArray<string>>([]);
  assertParts(mentionRoot, children);

  // A disabled field refuses every edit path, so it never offers a row to
  // insert into: a caller that disables the field mid-edit does not leave the
  // list floating over it.
  const open = disabled || dismissed ? Option.none() : mentionQuery(text);
  const active =
    visible.length === 0
      ? 0
      : ((highlighted % visible.length) + visible.length) % visible.length;

  const openKey = Option.isSome(open) ? "open" : "closed";
  // A new query starts at its first candidate.
  useLayoutEffect(() => {
    setHighlighted(0);
  }, [openKey]);

  const select = (value: string): void => {
    Option.match(open, {
      onNone: () => undefined,
      onSome: (query) => {
        setText(applyMention(text, query.start, value));
        onMention?.(value);
        setDismissed(false);
      },
    });
  };

  const context = useMemo<MentionContextValue>(
    () => ({
      text,
      query: open,
      highlighted: active,
      maxVisible,
      disabled,
      select,
      close: () => setDismissed(true),
      reportVisible: (values) =>
        setVisible((current) =>
          sameValues(current, values) ? current : values,
        ),
    }),
    // `select` closes over the current text and query.
    [active, disabled, maxVisible, open, text],
  );

  const controlStyle = mergeStyles(recipeStyle(MENTION_INPUT_CONTROL, theme), {
    ...(disabled ? {} : keyboardRing(theme)),
    ...selectionWash(theme),
    ...keepContent,
  });
  const hint = fieldHint({ placeholder, disabled }, theme, text, {
    origin: "host",
    align: "center",
    style: controlStyle,
  });

  return (
    <MentionContext.Provider value={context}>
      <div style={floatingRootStyle()}>
        <div
          role="group"
          aria-label={label}
          style={mergeStyles(
            recipeStyle(cn(MENTION_INPUT_FIELD, className), theme),
            {
              height: controlHeight(theme, "md"),
              ...disabledFade(disabled),
            },
          )}
        >
          <div
            style={hintHost({
              flexGrow: 1,
              alignSelf: "stretch",
              minWidth: 0,
            })}
          >
            <input
              {...rest}
              // The composite field paints the page role, so its value sits on
              // `background` rather than a plain field's `input` fill; the hint
              // is painted because the host's own placeholder is a fixed grey.
              theme={nativeTextTheme(theme, "background")}
              aria-label={label}
              // The hint is painted; its words travel on the help channel
              // while the field is empty.
              aria-description={fieldHelp(
                { description: rest["aria-description"], placeholder },
                text,
              )}
              testId={testId}
              value={text}
              readOnly={disabled}
              tabIndex={disabled ? -1 : 0}
              onChange={(event) => {
                if (disabled) return;
                setText(event.value ?? "");
                setDismissed(false);
              }}
              onSubmit={() => {
                if (disabled || visible.length === 0) return;
                select(visible[active] ?? "");
              }}
              onKeyDown={(event: EventPayload) => {
                if (disabled || Option.isNone(open) || visible.length === 0)
                  return;
                if (isDown(event)) {
                  setHighlighted((current) => current + 1);
                } else if (isUp(event)) {
                  setHighlighted((current) => current - 1);
                } else if (isDismiss(event)) {
                  setDismissed(true);
                }
              }}
              style={controlStyle}
            />
            {Option.match(hint, {
              onNone: () => null,
              onSome: (painted) => renderFieldHint(painted, testId),
            })}
          </div>
        </div>
        {children}
      </div>
    </MentionContext.Provider>
  );
};

/** {@link MentionInputList} props. */
export interface MentionInputListProps extends Omit<Props, "children"> {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** An element with the item props the list ranks. */
type ItemElement = ReactElement<{ readonly value: string }>;

const isItemElement = (child: unknown): child is ItemElement =>
  isValidElement<{ readonly value: string }>(child) &&
  child.type === MentionInputItem &&
  typeof (child.props as { readonly value?: unknown }).value === "string";

/** One row the list paints: the value it inserts and the item it was declared as. */
interface PaintedRow {
  readonly value: string;
  readonly item: ItemElement;
}

/** What a list last painted: its rows, and the one it had highlighted. */
interface PaintedList {
  readonly rows: ReadonlyArray<PaintedRow>;
  readonly highlighted: number;
}

/**
 * The list's entry: the house fade plus 4px of travel out from the field's
 * bottom edge, the offset every anchored panel uses.
 */
const listFrames = fadeFromAnchor("bottom", 4);

/** The list: a suggestion surface that leaves the way it arrived. */
export const MentionInputList = ({
  className,
  children,
  style,
  ...rest
}: MentionInputListProps) => {
  const theme = useTheme();
  const { disabled, query, highlighted, maxVisible, reportVisible } =
    useMention();
  const timing = useSurfaceTiming("normal");
  assertParts(mentionList, children);

  const items = Children.toArray(children).filter(isItemElement);
  const ranked = Option.match(query, {
    onNone: () => [],
    onSome: (open) =>
      rankMentions(
        items.map((item) => item.props.value),
        open.query,
        maxVisible,
      ),
  });
  const rows = Arr.flatMap(ranked, (value) =>
    Option.match(
      Arr.findFirst(items, (item) => item.props.value === value),
      {
        onNone: () => [],
        onSome: (item): ReadonlyArray<PaintedRow> => [{ value, item }],
      },
    ),
  );

  const key = ranked.join("\u0000");
  useLayoutEffect(() => {
    reportVisible(ranked);
    // `key` is the value identity of the list; `ranked` is rebuilt each render.
  }, [key, reportVisible]);

  // The box leaves when the query does, not when the filter empties: a list that
  // merely narrowed to nothing is cut, because the field is still open and a
  // ghost of rows the query no longer matches would be a lie about the search.
  const open = Option.isSome(query);
  const presence = useSurfacePresence(open, timing);

  // The rows the box paints while it leaves are the ones it was dismissed with,
  // so the reader sees the list they closed rather than an empty surface.
  const shown = useRef<Option.Option<PaintedList>>(Option.none());
  useLayoutEffect(() => {
    if (rows.length > 0) shown.current = Option.some({ rows, highlighted });
  });
  const leaving = !disabled && !presence.present && presence.mounted;
  const painted =
    rows.length > 0
      ? rows
      : leaving
        ? Option.getOrElse(
            Option.map(shown.current, (last) => last.rows),
            () => [],
          )
        : [];
  const active =
    rows.length > 0
      ? highlighted
      : Option.getOrElse(
          Option.map(shown.current, (last) => last.highlighted),
          () => 0,
        );

  if (!presence.mounted || painted.length === 0) return null;

  return (
    <FloatingLayer
      side="bottom"
      align="start"
      sideOffset={4}
      collisionPadding={8}
      motion={presenceMotion(listFrames, presence)}
      role="group"
      aria-label="Mentions"
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(MENTION_INPUT_LIST, className), theme), {
          // A positioned box is what the leaving guard is inset against.
          position: "relative",
          ...presenceStyle(presence.present),
        }),
        style,
      )}
    >
      {painted.map((row, index) => (
        <MentionItemContext.Provider
          key={row.value}
          value={{ highlighted: index === active, leaving: !presence.present }}
        >
          {row.item}
        </MentionItemContext.Provider>
      ))}
      <PresenceShield present={presence.present} />
    </FloatingLayer>
  );
};

/** {@link MentionInputItem} props. */
export interface MentionInputItemProps extends Omit<Props, "children"> {
  /** The inserted name (without the `@`). */
  readonly value: string;
  /** What the row shows; defaults to `@value`. */
  readonly label?: string;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** One suggestion row. Press it, or highlight it and press Enter. */
export const MentionInputItem = ({
  value,
  label,
  className,
  style,
  ...rest
}: MentionInputItemProps) => {
  const theme = useTheme();
  const { highlighted, leaving } = useContext(MentionItemContext);
  const { select } = useMention();

  return (
    <div
      role="button"
      aria-selected={highlighted}
      // A row of a surface painted only for its exit leaves the window's Tab
      // order with it: it cannot take a press, so it must not be a stop either.
      tabIndex={leaving ? -1 : 0}
      {...rest}
      onMouseDown={() => select(value)}
      {...activationHandlers(() => select(value))}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(MENTION_INPUT_ITEM, className), theme), {
          backgroundColor: highlighted ? theme.colors.accent : undefined,
          color: highlighted
            ? theme.colors.accentForeground
            : theme.colors.popoverForeground,
        }),
        style,
      )}
    >
      <text style={recipeStyle(MENTION_INPUT_ITEM_TEXT, theme)}>
        {label ?? `@${value}`}
      </text>
    </div>
  );
};

/** Every part, so a misplaced sibling is named. */
const mentionParts: ReadonlyArray<PartComponent> = [
  MentionInput,
  MentionInputList,
  MentionInputItem,
];

const mentionRoot: PartsContract = {
  parent: "MentionInput",
  family: mentionParts,
  accepts: [MentionInputList],
  hint: "Put MentionInputList directly inside MentionInput.",
};

const mentionList: PartsContract = {
  parent: "MentionInputList",
  family: mentionParts,
  accepts: [MentionInputItem],
  hint: "Put MentionInputItem rows directly inside MentionInputList.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const mentionInputMeta = {
  name: "Mention input",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the query comes from the text, not the caret: mid-string editing is not supported (0.11.0 has no caret API)",
    "a space typed while the floating list is mounted is consumed by the runtime before the field sees it; Escape or a selection closes the list",
    "Tab insertion is not claimed: 0.11.0 moves focus at the platform level",
    "Enter arrives as the input's submit event, so it is handled there",
    "role=listbox and role=option are dropped from 0.11.0's accessibility dump, so the surface is a named group and rows are selected buttons",
    "no aria-activedescendant in 0.11.0",
    "maxVisible is a row budget: an unreadable one (NaN from a height measured before layout) reads as the house 6, not as no rows",
  ],
  docs: "docs/mention-input.mdx",
  example: "examples/mention-input.example.tsx",
  testFile: "src/behaviour/mention-input.test.tsx",
} as const;
