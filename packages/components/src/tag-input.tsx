/** @jsxImportSource @gpuix/react */
import type { KeyEvent, InputProps, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import {
  cn,
  TAG_INPUT_CAPTION,
  TAG_INPUT_CHIP,
  TAG_INPUT_CHIP_REMOVE,
  TAG_INPUT_CHIP_TEXT,
  TAG_INPUT_FIELD,
  TAG_INPUT_HINT,
  TAG_INPUT_ROOT,
} from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { createContext, useContext, useState } from "react";
import {
  fieldHelp,
  fieldHint,
  hintHost,
  renderFieldHint,
} from "@gpuixui/primitives/hint";
import { activationHandlers, isEnter } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import {
  addTokens,
  removeToken,
  splitDraft,
  tokensOf,
} from "./tag-input/logic.js";
import { recipeStyle } from "./internal/recipe.js";
import {
  controlHeight,
  controlRing,
  disabledFade,
  keepContent,
  nativeTextTheme,
  selectionWash,
  targetSize,
  useTheme,
} from "./internal/theme.js";

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

const useTagInput = (): TagInputContextValue => {
  const value = useContext(TagInputContext);
  if (value === undefined) {
    throw new Error("TagInput parts must be used inside TagInput");
  }
  return value;
};

export interface TagInputProps extends Omit<Props, "children"> {
  readonly value: ReadonlyArray<string>;

  readonly onValueChange: (value: ReadonlyArray<string>) => void;

  readonly label: string;

  readonly max?: number;

  readonly allowDuplicates?: boolean;
  readonly disabled?: boolean;

  readonly hint?: string;

  readonly caption?: string;

  readonly className?: string;
  readonly children?: PartChildren;
}

export const TagInput = ({
  value,
  onValueChange,
  label,
  max,
  allowDuplicates = false,
  disabled = false,
  hint,
  caption,
  className,
  children,
  style,
  ...rest
}: TagInputProps) => {
  const theme = useTheme();
  const [draft, setDraft] = useState("");
  assertParts(tagInputRoot, children);

  const tokens = tokensOf(value);

  const add = (incoming: ReadonlyArray<string>): void => {
    onValueChange(addTokens(tokens, incoming, { allowDuplicates, max }));
  };

  const commit = (): void => {
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
    tokens,
    draft,
    disabled,
    editDraft,
    addDraft: commit,
    remove: (token) => {
      if (disabled) return;
      onValueChange(removeToken(tokens, token));
    },
  };

  const note = caption?.trim();
  const quiet = hint?.trim();

  return (
    <TagInputContext.Provider value={context}>
      <div
        {...rest}
        style={mergeStyles(
          recipeStyle(cn("flex flex-col gap-1.5", className), theme),
          mergeStyles({ ...disabledFade(disabled) }, style),
        )}
      >
        <div
          role="group"
          aria-label={label}
          style={mergeStyles(recipeStyle(TAG_INPUT_ROOT, theme), {
            minHeight: controlHeight(theme, "md"),
          })}
        >
          {children}
          {quiet === undefined || quiet === "" ? null : (
            <text style={recipeStyle(TAG_INPUT_HINT, theme)}>{quiet}</text>
          )}
        </div>
        {note === undefined || note === "" ? null : (
          <text style={recipeStyle(TAG_INPUT_CAPTION, theme)}>{note}</text>
        )}
      </div>
    </TagInputContext.Provider>
  );
};

export interface TagInputFieldProps extends Omit<
  InputProps,
  "value" | "onChange" | "onSubmit" | "style"
> {
  readonly className?: string;
  readonly style?: StateStyle<TagInputFieldState>;
}

export interface TagInputFieldState {
  readonly disabled: boolean;
}

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
  const hint = fieldHint({ placeholder, disabled }, theme, draft, {
    origin: "host",
    align: "center",
    style: fieldStyle,
  });

  return (
    <div style={hintHost({ flexGrow: 1, minWidth: 0 })}>
      <input
        {...rest}
        theme={nativeTextTheme(theme, "background")}
        readOnly={disabled}
        tabIndex={disabled ? -1 : 0}
        value={draft}
        aria-description={fieldHelp(
          { description: rest["aria-description"], placeholder },
          draft,
        )}
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
        onSome: (painted) => renderFieldHint(painted, rest.testId),
      })}
    </div>
  );
};

export interface TagInputChipProps extends Omit<Props, "children" | "style"> {
  readonly value: string;

  readonly className?: string;
  readonly style?: StateStyle<TagInputChipState>;
}

export interface TagInputChipState {
  readonly disabled: boolean;
}

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
        recipeStyle(cn(TAG_INPUT_CHIP, className), theme),
        mergeStyles(
          disabled ? {} : { hover: { backgroundColor: theme.colors.accent } },

          resolveStyle(style, { disabled }),
        ),
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
          <Icon
            name="x"
            size="sm"
            color={
              disabled
                ? theme.colors.mutedForeground
                : theme.colors.secondaryForeground
            }
          />
        </div>
      )}
    </div>
  );
};

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
