/**
 * MentionInput: `@name` autocompletion in a text field.
 *
 * The token rules (where a query starts, how names rank, what replaces the
 * token) live in `mention/logic.ts`. 0.10.0 has no caret position, so the query
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
import * as Option from "effect/Option";
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import { useControllableState } from "./internal/controllable.js";
import { isActivation, isDismiss, isDown, isUp } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import {
  applyMention,
  mentionQuery,
  rankMentions,
  type MentionQuery,
} from "./mention/logic.js";
import { recipeStyle } from "./internal/recipe.js";
import { controlHeight, focusRing, useTheme } from "./internal/theme.js";

/** The rules a mention part follows; throws outside a {@link MentionInput}. */
interface MentionContextValue {
  readonly text: string;
  readonly query: Option.Option<MentionQuery>;
  readonly highlighted: number;
  readonly maxVisible: number;
  readonly select: (value: string) => void;
  readonly close: () => void;
  readonly reportVisible: (values: ReadonlyArray<string>) => void;
}

const MentionContext = createContext<MentionContextValue | undefined>(
  undefined,
);

/** Whether the item is the highlighted row, set by the list. */
const MentionItemContext = createContext<{ readonly highlighted: boolean }>({
  highlighted: false,
});

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
  maxVisible = 6,
  disabled = false,
  className,
  children,
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
  const [focused, setFocused] = useState(false);
  assertParts(mentionRoot, children);

  const open = dismissed ? Option.none() : mentionQuery(text);
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
      select,
      close: () => setDismissed(true),
      reportVisible: (values) =>
        setVisible((current) =>
          sameValues(current, values) ? current : values,
        ),
    }),
    // `select` closes over the current text and query.
    [active, maxVisible, open, text],
  );

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
              opacity: disabled ? 0.5 : 1,
              ...(focused ? focusRing(theme) : {}),
            },
          )}
        >
          <input
            {...rest}
            aria-label={label}
            testId={testId}
            value={text}
            readOnly={disabled}
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
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={recipeStyle(MENTION_INPUT_CONTROL, theme)}
          />
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

/** The ranked suggestion surface, rendered only while a query is open. */
export const MentionInputList = ({
  className,
  children,
  style,
  ...rest
}: MentionInputListProps) => {
  const theme = useTheme();
  const { query, highlighted, maxVisible, reportVisible } = useMention();
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

  const key = ranked.join("\u0000");
  useLayoutEffect(() => {
    reportVisible(ranked);
    // `key` is the value identity of the list; `ranked` is rebuilt each render.
  }, [key, reportVisible]);

  if (ranked.length === 0) return null;

  return (
    <FloatingLayer
      side="bottom"
      align="start"
      sideOffset={4}
      collisionPadding={8}
      role="group"
      aria-label="Mentions"
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(MENTION_INPUT_LIST, className), theme),
        style,
      )}
    >
      {ranked.map((value, index) => {
        const item = items.find((candidate) => candidate.props.value === value);
        if (item === undefined) return null;
        return (
          <MentionItemContext.Provider
            key={value}
            value={{ highlighted: index === highlighted }}
          >
            {item}
          </MentionItemContext.Provider>
        );
      })}
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
  const { highlighted } = useContext(MentionItemContext);
  const { select } = useMention();

  return (
    <div
      role="button"
      aria-selected={highlighted}
      tabIndex={0}
      {...rest}
      onMouseDown={() => select(value)}
      onKeyDown={(event: EventPayload) => {
        if (isActivation(event)) select(value);
      }}
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
    "the query comes from the text, not the caret: mid-string editing is not supported (0.10.0 has no caret API)",
    "a space typed while the floating list is mounted is consumed by the runtime before the field sees it; Escape or a selection closes the list",
    "Tab insertion is not claimed: 0.10.0 moves focus at the platform level",
    "Enter arrives as the input's submit event, so it is handled there",
    "role=listbox and role=option are dropped from 0.10.0's accessibility dump, so the surface is a named group and rows are selected buttons",
    "no aria-activedescendant in 0.10.0",
  ],
  docs: "docs/mention-input.mdx",
  example: "examples/mention-input.example.tsx",
  testFile: "src/behaviour/mention-input.test.tsx",
} as const;
