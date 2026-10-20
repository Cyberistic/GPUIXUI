/**
 * TagInput: a set of tokens entered through a field.
 *
 * The root owns the tokens and the draft; the field writes the draft and the
 * chips remove by value. The add rules live in `tag-input/logic.ts`, so the
 * keyboard wiring has nothing to decide beyond which rule to call.
 *
 * A typed comma arrives through `onChange` (0.10.0 has no `preventDefault`), so
 * the field treats a comma-containing edit as a batch and the pure rule in
 * `tag-input/logic.ts` decides how much of it is complete. Pasting `"a,b"`
 * therefore adds two tokens, and typing `","` commits the one before it while
 * the rest stays the draft.
 */

import type {
  EventPayload,
  InputProps,
  Props,
  PublicInstance,
} from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { activationHandlers } from "./internal/activate.js";
import { useFocusState } from "./internal/focus.js";
import { isEnter } from "./internal/key.js";
import { controlNameFrom } from "./internal/name.js";
import { useNativeFocusId } from "./internal/native-focus.js";
import { useMergedRef } from "./internal/ref.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { stateDescription } from "./internal/state-description.js";
import {
  addTokens,
  editDraft,
  removeToken,
  splitDraft,
} from "./tag-input/logic.js";
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
  /** The group's label, so the field inside it can be named. */
  readonly name: string;
  readonly editDraft: (text: string) => void;
  readonly addDraft: () => void;
  readonly remove: (value: string) => void;
  /** Puts focus in the field after a control that removed itself was used. */
  readonly focusField: () => void;
  /** Seeds the group ring for an `autoFocus` field (no React event arrives). */
  readonly setFocused: (focused: boolean) => void;
  /** Registers the field's host so the group ring can follow native focus. */
  readonly registerField: (instance: PublicInstance | null) => void;
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
  const renderer = useGpuix().renderer;
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [fieldId, setFieldId] = useState<number | null>(null);
  const focusedId = useNativeFocusId(!disabled);
  const registerField = useCallback((instance: PublicInstance | null) => {
    setFieldId(instance?.id ?? null);
  }, []);
  const focusField = useCallback(() => {
    if (fieldId !== null) renderer?.focusElement?.(fieldId);
  }, [fieldId, renderer]);
  // A null sample keeps the `autoFocus` seed; once a host is reported it is the
  // only truth, so the ring clears when the field loses native focus (plan 755).
  const groupFocused =
    !disabled && (focusedId === null ? focused : focusedId === fieldId);
  assertParts(tagInputRoot, children);

  // The rules return the current list by reference when they accept nothing, so
  // a refused duplicate, cap or empty draft reports no change (plan 562).
  const add = (incoming: ReadonlyArray<string>): void => {
    const next = addTokens(value, incoming, { allowDuplicates, max });
    if (next !== value) onValueChange(next);
  };

  const commit = (): void => {
    if (disabled) return;
    add(splitDraft(draft));
    setDraft("");
  };

  const editDraftValue = (text: string): void => {
    const edited = editDraft(text);
    add(edited.add);
    setDraft(edited.draft);
  };

  const context: TagInputContextValue = {
    tokens: value,
    draft,
    disabled,
    name: label,
    editDraft: editDraftValue,
    addDraft: commit,
    remove: (token) => {
      const next = removeToken(value, token);
      if (next !== value) onValueChange(next);
    },
    setFocused,
    registerField,
    focusField,
  };

  return (
    <TagInputContext.Provider value={context}>
      <div
        role="group"
        aria-label={label}
        {...rest}
        {...stateDescription(disabled, rest["aria-description"])}
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
            ...(groupFocused ? focusRing(theme) : {}),
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
  autoFocus = false,
  ref,
  ...rest
}: TagInputFieldProps) => {
  const theme = useTheme();
  const {
    draft,
    disabled,
    name: groupName,
    editDraft,
    addDraft,
    setFocused,
    registerField,
  } = useTagInput();
  // 0.10.0 cannot name an input from a sibling `<text>`: the caller's
  // `aria-label`, then the field's placeholder, then the group's label.
  const name = controlNameFrom(rest["aria-label"], [
    rest.placeholder,
    groupName,
  ]);
  const attach = useCallback(
    (next: PublicInstance | null) => registerField(next),
    [registerField],
  );
  const setField = useMergedRef<PublicInstance | null>(attach, ref);
  const seeded = useRef(false);

  // `autoFocus` focuses the native input after React's effects, so `onFocus`
  // never runs; seed the group's ring from the prop instead (plan 522).
  useLayoutEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (autoFocus && !disabled) setFocused(true);
  }, [autoFocus, disabled, setFocused]);

  return (
    <input
      {...rest}
      aria-label={name}
      {...(disabled ? { tabIndex: -1 } : {})}
      {...stateDescription(disabled, rest["aria-description"])}
      autoFocus={autoFocus && !disabled}
      ref={setField}
      readOnly={disabled}
      value={draft}
      onChange={(event) => editDraft(event.value ?? "")}
      onKeyDown={(event: EventPayload) => {
        onKeyDown?.(event);
        if (isEnter(event)) addDraft();
      }}
      onSubmit={() => addDraft()}
      onFocus={(event) => onFocus?.(event)}
      onBlur={(event) => onBlur?.(event)}
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

/**
 * One token with a removal control.
 *
 * The control is named `<testId>-remove` when the chip has a `testId`, so a
 * consumer or a native harness can address one token's control.
 */
export const TagInputChip = ({
  value,
  style,
  ref,
  ...rest
}: TagInputChipProps) => {
  const theme = useTheme();
  const { disabled, remove, focusField } = useTagInput();
  const [instance, setInstance] = useState<PublicInstance | undefined>(
    undefined,
  );
  const attach = useCallback((next: PublicInstance | null) => {
    setInstance(next ?? undefined);
  }, []);
  const [focused, setFocused] = useFocusState(false, disabled, instance?.id);
  const removeTestId =
    rest.testId === undefined ? undefined : `${rest.testId}-remove`;
  // The control (and its chip) leaves the tree, so focus would be left on
  // nothing; the field is the next stop and always exists (plan 769).
  const removeAndFocus = (): void => {
    remove(value);
    focusField();
  };

  return (
    <div
      {...rest}
      ref={ref}
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
          testId={removeTestId}
          tabIndex={0}
          ref={attach}
          onClick={removeAndFocus}
          {...activationHandlers(removeAndFocus)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            ...textStyle(theme, "caption"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 16,
            height: 16,
            borderRadius: theme.radius.sm,
            color: theme.colors.mutedForeground,
            ...(focused ? focusRing(theme) : {}),
            hover: {
              backgroundColor: theme.colors.accent,
              color: theme.colors.accentForeground,
            },
          }}
        >
          <Icon name="x" color={theme.colors.mutedForeground} size="xs" />
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
  focusable: true,
  limitations: [
    "controlled only: the caller owns the tokens and renders chips from that list",
    "no aria-disabled in 0.10.0: disabled is a readOnly field plus dimming, and the group/field announce Disabled through aria-description",
    "a typed comma commits through onChange because the runtime has no preventDefault",
    "Backspace on an empty field is not observable in 0.10.0 (no keyDown is emitted), so removal is the chip control",
  ],
  docs: "docs/tag-input.mdx",
  example: "examples/tag-input.example.tsx",
  testFile: "src/behaviour/tag-input.test.tsx",
} as const;
