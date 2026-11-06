/** @jsxImportSource @gpuix/react */
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

interface MentionContextValue {
  readonly text: string;
  readonly query: Option.Option<MentionQuery>;
  readonly highlighted: number;
  readonly maxVisible: number;

  readonly disabled: boolean;
  readonly select: (value: string) => void;
  readonly close: () => void;
  readonly reportVisible: (values: ReadonlyArray<string>) => void;
}

const MentionContext = createContext<MentionContextValue | undefined>(
  undefined,
);

const MentionItemContext = createContext<{
  readonly highlighted: boolean;
  readonly leaving: boolean;
}>({ highlighted: false, leaving: false });

const useMention = (): MentionContextValue => {
  const value = useContext(MentionContext);
  if (value === undefined) {
    throw new Error("MentionInput parts must be used inside MentionInput");
  }
  return value;
};

export interface MentionInputProps extends Omit<
  InputProps,
  "value" | "style" | "onChange" | "onSubmit"
> {
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;

  readonly onMention?: (value: string) => void;

  readonly label: string;

  readonly maxVisible?: number;
  readonly disabled?: boolean;

  readonly className?: string;
  readonly children?: PartChildren;
}

const sameValues = (
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>,
): boolean =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

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

  const open = disabled || dismissed ? Option.none() : mentionQuery(text);
  const active =
    visible.length === 0
      ? 0
      : ((highlighted % visible.length) + visible.length) % visible.length;

  const openKey = Option.isSome(open) ? "open" : "closed";

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
              theme={nativeTextTheme(theme, "background")}
              aria-label={label}
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

export interface MentionInputListProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: PartChildren;
}

type ItemElement = ReactElement<{ readonly value: string }>;

const isItemElement = (child: unknown): child is ItemElement =>
  isValidElement<{ readonly value: string }>(child) &&
  child.type === MentionInputItem &&
  typeof (child.props as { readonly value?: unknown }).value === "string";

interface PaintedRow {
  readonly value: string;
  readonly item: ItemElement;
}

interface PaintedList {
  readonly rows: ReadonlyArray<PaintedRow>;
  readonly highlighted: number;
}

const listFrames = fadeFromAnchor("bottom", 4);

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
  }, [key, reportVisible]);

  const open = Option.isSome(query);
  const presence = useSurfacePresence(open, timing);

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

export interface MentionInputItemProps extends Omit<Props, "children"> {
  readonly value: string;

  readonly label?: string;

  readonly className?: string;
}

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

export const mentionInputMeta = {
  name: "Mention input",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the query comes from the text, not the caret: mid-string editing is not supported (0.11.0 has no caret API)",
    "a mention cannot be painted as a link *inside* the field: an `<input>` paints one colour for its whole value, so the field shows plain `@name` and the colour and the link belong to the rendered comment (`mentionRuns` in the docs drawing shows the painted-mirror technique a browser can use)",
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
