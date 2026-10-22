/**
 * TagInput: a set of tokens entered through a field.
 *
 * The root owns the tokens and the draft; the field writes the draft and the
 * chips remove by value. The add rules live in `tag-input/logic.ts`, so the
 * keyboard wiring has nothing to decide beyond which rule to call.
 *
 * A typed comma arrives through `onChange` (the field reports its whole text),
 * so the field treats any comma-containing edit as a batch: everything before
 * the last comma is committed and the remainder stays the draft. Pasting
 * `"a,b"` therefore adds two tokens, and typing `","` adds the one before it.
 */

import type { KeyEvent, InputProps, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import {
  cn,
  TAG_INPUT_CHIP,
  TAG_INPUT_CHIP_REMOVE,
  TAG_INPUT_CHIP_TEXT,
  TAG_INPUT_FIELD,
  TAG_INPUT_ROOT,
} from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { createContext, useContext, useState } from "react";
import { hintHost, renderHint, textHint } from "./internal/hint.js";
import { activationHandlers, isEnter } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { addTokens, removeToken, splitDraft } from "./tag-input/logic.js";
import { recipeStyle } from "./internal/recipe.js";
import {
  controlHeight,
  controlRing,
  keepContent,
  nativeTextTheme,
  selectionWash,
  targetSize,
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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
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
  className,
  children,
  style,
  ...rest
}: TagInputProps) => {
  const theme = useTheme();
  const [draft, setDraft] = useState("");
  assertParts(tagInputRoot, children);

  const add = (incoming: ReadonlyArray<string>): void => {
    onValueChange(addTokens(value, incoming, { allowDuplicates, max }));
  };

  const commit = (): void => {
    // A disabled group refuses every edit path, so neither the tokens nor the
    // draft move: Enter, a submit and a cleared draft all arrive here.
    if (disabled) return;
    add(splitDraft(draft));
    setDraft("");
  };

  const editDraft = (text: string): void => {
    if (disabled) return;
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
    remove: (token) => {
      if (disabled) return;
      onValueChange(removeToken(value, token));
    },
  };

  return (
    <TagInputContext.Provider value={context}>
      <div
        role="group"
        aria-label={label}
        {...rest}
        style={mergeStyles(
          mergeStyles(recipeStyle(cn(TAG_INPUT_ROOT, className), theme), {
            minHeight: controlHeight(theme, "md"),
            opacity: disabled ? 0.5 : 1,
          }),
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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly style?: StateStyle<TagInputFieldState>;
}

/** What the field draws: whether the group is disabled. */
export interface TagInputFieldState {
  readonly disabled: boolean;
}

/** The `<input>` that enters tokens. It reads and writes the root's draft. */
export const TagInputField = ({
  className,
  style,
  placeholder,
  onKeyDown,
  onFocus,
  onBlur,
  ...rest
}: TagInputFieldProps) => {
  const theme = useTheme();
  const { draft, disabled, editDraft, addDraft } = useTagInput();

  const fieldStyle = mergeStyles(
    mergeStyles(recipeStyle(cn(TAG_INPUT_FIELD, className), theme), {
      height: controlHeight(theme, "sm"),
      ...controlRing(theme, { disabled }),
      ...selectionWash(theme),
      ...keepContent,
    }),
    resolveStyle(style, { disabled }),
  );
  const hint = textHint(
    theme,
    { style: fieldStyle, align: "center", disabled },
    placeholder,
    draft,
  );

  return (
    <div style={hintHost({ flexGrow: 1 })}>
      <input
        {...rest}
        // The group paints the page role behind the tokens and this field; the
        // hint is painted, because the host's own placeholder is a fixed grey.
        theme={nativeTextTheme(theme, "background")}
        readOnly={disabled}
        // A disabled field leaves the tab order: the host has no `disabled`,
        // and `readOnly` still takes focus.
        tabIndex={disabled ? -1 : 0}
        value={draft}
        onChange={(event) => editDraft(event.value ?? "")}
        onKeyDown={(event: KeyEvent) => {
          onKeyDown?.(event);
          if (isEnter(event)) addDraft();
        }}
        onSubmit={() => addDraft()}
        onFocus={(event) => onFocus?.(event)}
        onBlur={(event) => onBlur?.(event)}
        style={fieldStyle}
      />
      {Option.match(hint, {
        onNone: () => null,
        onSome: (painted) => renderHint(painted, rest.testId),
      })}
    </div>
  );
};

/** {@link TagInputChip} props. */
export interface TagInputChipProps extends Omit<Props, "children" | "style"> {
  /** The token this chip removes. */
  readonly value: string;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly style?: StateStyle<TagInputChipState>;
}

/** What a chip draws: whether the group is disabled. */
export interface TagInputChipState {
  readonly disabled: boolean;
}

/** One token with a removal control. */
export const TagInputChip = ({
  value,
  className,
  style,
  testId,
  ...rest
}: TagInputChipProps) => {
  const theme = useTheme();
  const { disabled, remove } = useTagInput();

  return (
    <div
      {...rest}
      testId={testId}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(TAG_INPUT_CHIP, className), theme), {
          opacity: disabled ? 0.6 : 1,
        }),
        resolveStyle(style, { disabled }),
      )}
    >
      <text style={recipeStyle(TAG_INPUT_CHIP_TEXT, theme)}>{value}</text>
      {disabled ? null : (
        <div
          role="button"
          aria-label={`Remove ${value}`}
          testId={testId === undefined ? undefined : `${testId}-remove`}
          tabIndex={0}
          onClick={() => remove(value)}
          {...activationHandlers(() => remove(value))}
          style={mergeStyles(recipeStyle(TAG_INPUT_CHIP_REMOVE, theme), {
            width: targetSize.minimum,
            height: targetSize.minimum,
            flexShrink: 0,
            ...controlRing(theme),
            hover: { backgroundColor: theme.colors.accent },
          })}
        >
          <Icon name="x" size="sm" color={theme.colors.mutedForeground} />
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
    "no aria-disabled in 0.11.0: disabled is a readOnly field plus dimming",
    "a typed comma commits through onChange because the field reports the text it holds",
    "Backspace on an empty field is not observable in 0.11.0 (no keyDown is emitted), so removal is the chip control",
  ],
  docs: "docs/tag-input.mdx",
  example: "examples/tag-input.example.tsx",
  testFile: "src/behaviour/tag-input.test.tsx",
} as const;
