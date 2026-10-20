/**
 * TagInput: a set of tokens entered through a field.
 *
 * The root owns the tokens and the draft; the field writes the draft and the
 * chips remove by value. The add rules live in `tag-input/logic.ts`, so the
 * keyboard wiring has nothing to decide beyond which rule to call.
 *
 * A typed comma arrives through `onChange` (0.10.0 has no `preventDefault`), so
 * the field treats any comma-containing edit as a batch: everything before the
 * last comma is committed and the remainder stays the draft. Pasting `"a,b"`
 * therefore adds two tokens, and typing `","` adds the one before it.
 */

import type { KeyEvent, InputProps, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { createContext, useContext, useState } from "react";
import { isActivation, isEnter } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { addTokens, removeToken, splitDraft } from "./tag-input/logic.js";
import {
  controlHeight,
  focusRing,
  textStyle,
  useTheme,
} from "./internal/theme.js";

/** The rules a tag part follows; throws outside a {@link TagInput}. */
interface TagInputContextValue {
  readonly tokens: ReadonlyArray<string>;
  readonly draft: string;
  readonly disabled: boolean;
  readonly editDraft: (text: string) => void;
  readonly addDraft: () => void;
  readonly remove: (value: string) => void;
  readonly setFocused: (focused: boolean) => void;
}

const TagInputContext = createContext<TagInputContextValue | undefined>(
  undefined,
);

/** The tag input a part belongs to. Throws when there is none. */
const useTagInput = (): TagInputContextValue => {
  const value = useContext(TagInputContext);
  if (value === undefined) {
    throw new Error("TagInput parts must be used inside TagInput");
  }
  return value;
};

/** {@link TagInput} props. */
export interface TagInputProps extends Omit<Props, "children"> {
  /** The tokens. The caller owns them; chips are rendered from this list. */
  readonly value: ReadonlyArray<string>;
  /** Every accepted token list, including a removal. */
  readonly onValueChange: (value: ReadonlyArray<string>) => void;
  /** The group's accessible name. */
  readonly label: string;
  /** Maximum tokens; additions past it are refused. */
  readonly max?: number;
  /** Keep repeated tokens. Default `false`. */
  readonly allowDuplicates?: boolean;
  readonly disabled?: boolean;
  readonly children?: PartChildren;
}

/** The token group: value, draft, rules and the focus ring. */
export const TagInput = ({
  value,
  onValueChange,
  label,
  max,
  allowDuplicates = false,
  disabled = false,
  children,
  style,
  ...rest
}: TagInputProps) => {
  const theme = useTheme();
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  assertParts(tagInputRoot, children);

  const add = (incoming: ReadonlyArray<string>): void => {
    onValueChange(addTokens(value, incoming, { allowDuplicates, max }));
  };

  const commit = (): void => {
    add(splitDraft(draft));
    setDraft("");
  };

  const editDraft = (text: string): void => {
    const segments = Str.split(",")(text);
    if (Arr.length(segments) < 2) {
      setDraft(text);
      return;
    }
    const last = Option.getOrElse(Arr.last(segments), () => "");
    add(
      splitDraft(Arr.join(Arr.take(segments, Arr.length(segments) - 1), ",")),
    );
    setDraft(last);
  };

  const context: TagInputContextValue = {
    tokens: value,
    draft,
    disabled,
    editDraft,
    addDraft: commit,
    remove: (token) => onValueChange(removeToken(value, token)),
    setFocused,
  };

  return (
    <TagInputContext.Provider value={context}>
      <div
        role="group"
        aria-label={label}
        {...rest}
        style={mergeStyles(
          {
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: theme.spacing.xs,
            minHeight: controlHeight(theme, "md"),
            paddingLeft: theme.spacing.sm,
            paddingRight: theme.spacing.sm,
            paddingTop: theme.spacing["2xs"],
            paddingBottom: theme.spacing["2xs"],
            backgroundColor: theme.colors.background,
            borderRadius: theme.radius.md,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
            opacity: disabled ? 0.5 : 1,
            ...(focused ? focusRing(theme) : {}),
          },
          style,
        )}
      >
        {children}
      </div>
    </TagInputContext.Provider>
  );
};

/** {@link TagInputField} props. */
export interface TagInputFieldProps extends Omit<
  InputProps,
  "value" | "onChange" | "onSubmit" | "style"
> {
  readonly style?: StateStyle<TagInputFieldState>;
}

/** What the field draws: whether the group is disabled. */
export interface TagInputFieldState {
  readonly disabled: boolean;
}

/** The `<input>` that enters tokens. It reads and writes the root's draft. */
export const TagInputField = ({
  style,
  onKeyDown,
  onFocus,
  onBlur,
  ...rest
}: TagInputFieldProps) => {
  const theme = useTheme();
  const { draft, disabled, editDraft, addDraft, setFocused } = useTagInput();

  return (
    <input
      {...rest}
      readOnly={disabled}
      value={draft}
      onChange={(event) => editDraft(event.value ?? "")}
      onKeyDown={(event: KeyEvent) => {
        onKeyDown?.(event);
        if (isEnter(event)) addDraft();
      }}
      onSubmit={() => addDraft()}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={mergeStyles(
        {
          ...textStyle(theme, "body"),
          flexGrow: 1,
          minWidth: 80,
          height: controlHeight(theme, "sm"),
          backgroundColor: undefined,
          color: theme.colors.inputForeground,
        },
        resolveStyle(style, { disabled }),
      )}
    />
  );
};

/** {@link TagInputChip} props. */
export interface TagInputChipProps extends Omit<Props, "children" | "style"> {
  /** The token this chip removes. */
  readonly value: string;
  readonly style?: StateStyle<TagInputChipState>;
}

/** What a chip draws: whether the group is disabled. */
export interface TagInputChipState {
  readonly disabled: boolean;
}

/** One token with a removal control. */
export const TagInputChip = ({ value, style, ...rest }: TagInputChipProps) => {
  const theme = useTheme();
  const { disabled, remove } = useTagInput();

  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.xs,
          paddingLeft: theme.spacing.sm,
          paddingRight: theme.spacing.sm,
          paddingTop: theme.spacing["2xs"],
          paddingBottom: theme.spacing["2xs"],
          backgroundColor: theme.colors.muted,
          borderRadius: theme.radius.sm,
          opacity: disabled ? 0.6 : 1,
        },
        resolveStyle(style, { disabled }),
      )}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {value}
      </text>
      {disabled ? null : (
        <div
          role="button"
          aria-label={`Remove ${value}`}
          tabIndex={0}
          onClick={() => remove(value)}
          onKeyDown={(event: KeyEvent) => {
            if (isActivation(event)) remove(value);
          }}
          style={{
            ...textStyle(theme, "caption"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 16,
            height: 16,
            borderRadius: theme.radius.sm,
            color: theme.colors.mutedForeground,
            hover: {
              backgroundColor: theme.colors.accent,
              color: theme.colors.accentForeground,
            },
          }}
        >
          <text>✕</text>
        </div>
      )}
    </div>
  );
};

/** Every part, so a misplaced sibling is named. */
const tagInputParts: ReadonlyArray<PartComponent> = [
  TagInput,
  TagInputField,
  TagInputChip,
];

const tagInputRoot: PartsContract = {
  parent: "TagInput",
  family: tagInputParts,
  accepts: [TagInputField, TagInputChip],
  hint: "Put TagInputChip and TagInputField directly inside TagInput.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const tagInputMeta = {
  name: "Tag / token input",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "controlled only: the caller owns the tokens and renders chips from that list",
    "no aria-disabled in 0.10.0: disabled is a readOnly field plus dimming",
    "a typed comma commits through onChange because the runtime has no preventDefault",
    "Backspace on an empty field is not observable in 0.10.0 (no keyDown is emitted), so removal is the chip control",
  ],
  docs: "docs/tag-input.mdx",
  example: "examples/tag-input.example.tsx",
  testFile: "src/behaviour/tag-input.test.tsx",
} as const;
