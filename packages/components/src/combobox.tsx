/**
 * Combobox: a searchable single- or multi-select built on GPUix's headless
 * combobox, with our own ranking from `combobox/logic.ts`.
 *
 * GPUix's `items` are strings and its `filter` is a predicate that preserves the
 * original order, so a predicate cannot express our ranking. The adapter therefore
 * feeds it an already-ranked `items` array (`filter={null}`) and controls
 * `inputValue`, which is the documented fallback plan 116 §3 allowed. Values are
 * the option `value`, never the displayed label.
 *
 * Focus, the active row and Enter/arrow/Escape handling stay GPUix's: those are
 * proven in its own suite and reimplementing them here would be a second, worse
 * copy. The parts own the trigger label, the ranking adapter and the selection
 * payload, and a part is never given a duplicated `value` prop.
 */

import {
  Combobox as HeadlessCombobox,
  ComboboxContent as HeadlessContent,
  ComboboxEmpty as HeadlessEmpty,
  ComboboxInput as HeadlessInput,
  ComboboxItem as HeadlessItem,
  ComboboxList as HeadlessList,
  ComboboxTrigger as HeadlessTrigger,
  type ComboboxItemState,
  type ComboboxListProps as HeadlessListProps,
  type ComboboxTriggerProps as HeadlessTriggerProps,
  type ComboboxValue,
} from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance, StyleDesc } from "@gpuix/react";
import { mergeStyles, type FloatingContentProps } from "@gpuix/react/floating";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  labelOf,
  filterOptions,
  type ComboboxOption,
} from "./combobox/logic.js";
import { useControllableState } from "./internal/controllable.js";
import { isDismiss } from "./internal/key.js";
import {
  controlHeight,
  elevationShadow,
  textStyle,
  useTheme,
  type Theme,
} from "./internal/theme.js";

/** What a selection callback receives: one value, several, or none. */
export type ComboboxSelection = string | null | ReadonlyArray<string>;

/** The rules a combobox part follows; throws outside a {@link Combobox}. */
interface ComboboxContextValue {
  readonly options: ReadonlyArray<ComboboxOption>;
  readonly selectedValues: ReadonlyArray<string>;
  readonly open: boolean;
  readonly disabled: boolean;
  readonly labelFor: (value: string) => string;
  readonly isDisabled: (value: string) => boolean;
  readonly registerTrigger: (instance: PublicInstance | null) => void;
  /** An Escape press: close and return focus to the trigger. */
  readonly noteEscape: () => void;
  /** An outside press already moved focus, so do not restore it. */
  readonly noteOutsidePress: () => void;
}

const ComboboxContext = createContext<ComboboxContextValue | undefined>(
  undefined,
);

/** The combobox a part belongs to. Throws when there is none. */
const useCombobox = (): ComboboxContextValue => {
  const value = useContext(ComboboxContext);
  if (value === undefined) {
    throw new Error("Combobox parts must be used inside Combobox");
  }
  return value;
};

/** {@link Combobox} props. */
export interface ComboboxProps {
  readonly options: ReadonlyArray<ComboboxOption>;
  /** The controlled selection. `undefined` means uncontrolled. */
  readonly value?: string | ReadonlyArray<string>;
  readonly defaultValue?: string | ReadonlyArray<string>;
  readonly onValueChange?: (value: ComboboxSelection) => void;
  /** Default `false`: one value and the popup closes on select. */
  readonly multiple?: boolean;
  readonly disabled?: boolean;
  readonly children?: ReactNode;
}

/** Narrow the public selection to the runtime's value shape. */
const toRuntimeValue = (
  value: string | ReadonlyArray<string> | undefined,
  multiple: boolean,
): ComboboxValue | undefined =>
  value === undefined
    ? undefined
    : multiple
      ? typeof value === "string"
        ? [value]
        : [...value]
      : typeof value === "string"
        ? value
        : (value[0] ?? null);

/** The option carrying `value`, if any. */
const optionOf = (
  options: ReadonlyArray<ComboboxOption>,
  value: string,
): Option.Option<ComboboxOption> =>
  Arr.findFirst(options, (option) => option.value === value);

/** The row's look in each interaction state. */
const rowStyle = (theme: Theme, state: ComboboxItemState): StyleDesc => ({
  ...textStyle(theme, "label"),
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: theme.spacing.md,
  minHeight: controlHeight(theme, "sm"),
  paddingLeft: theme.spacing.md,
  paddingRight: theme.spacing.md,
  paddingTop: theme.spacing.xs,
  paddingBottom: theme.spacing.xs,
  borderRadius: theme.radius.sm,
  cursor: state.disabled ? "not-allowed" : "pointer",
  opacity: state.disabled ? 0.5 : 1,
  backgroundColor: state.highlighted ? theme.colors.hover : undefined,
  color: state.selected
    ? theme.colors.foreground
    : theme.colors.popoverForeground,
  hover: state.disabled ? undefined : { backgroundColor: theme.colors.hover },
});

/**
 * A searchable single- or multi-select. Compose {@link ComboboxTrigger} and
 * {@link ComboboxContent} (with {@link ComboboxInput}, {@link ComboboxList} and
 * {@link ComboboxEmpty}) inside it.
 */
export const Combobox = ({
  options,
  value: valueProp,
  defaultValue,
  onValueChange,
  multiple = false,
  disabled = false,
  children,
}: ComboboxProps) => {
  const renderer = useGpuix().renderer;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const trigger = useRef<PublicInstance | null>(null);
  const restoreFocus = useRef(false);
  const wasOpen = useRef(false);

  const [selected, setSelected] = useControllableState<ComboboxValue>({
    value: toRuntimeValue(valueProp, multiple),
    defaultValue:
      toRuntimeValue(defaultValue, multiple) ?? (multiple ? [] : null),
    onChange: onValueChange,
  });

  const selectedValues: ReadonlyArray<string> = Array.isArray(selected)
    ? selected
    : selected === null
      ? []
      : [selected];

  const visible = filterOptions(options, query);
  const items = Arr.map(visible, (option) => option.value);

  const labelFor = (value: string): string =>
    Option.match(optionOf(options, value), {
      onNone: () => value,
      onSome: labelOf,
    });

  /** Close, restoring focus only for the paths that should (Escape, select). */
  useLayoutEffect(() => {
    if (wasOpen.current && !open && restoreFocus.current) {
      const instance = trigger.current;
      if (instance !== null) renderer?.focusElement?.(instance.id);
    }
    if (!open) restoreFocus.current = false;
    wasOpen.current = open;
  }, [open, renderer]);

  return (
    <ComboboxContext.Provider
      value={{
        options,
        selectedValues,
        open,
        disabled,
        labelFor,
        isDisabled: (value) =>
          Option.exists(
            optionOf(options, value),
            (option) => option.disabled === true,
          ),
        registerTrigger: (instance) => {
          trigger.current = instance;
        },
        noteEscape: () => {
          restoreFocus.current = true;
        },
        noteOutsidePress: () => {
          restoreFocus.current = false;
        },
      }}
    >
      <HeadlessCombobox
        items={items}
        value={selected}
        onValueChange={(next) => {
          restoreFocus.current = !multiple;
          setSelected(next);
        }}
        inputValue={query}
        onInputValueChange={(next) => {
          // GPUix writes the selected label into the input as it closes a
          // single-select; that is not a query the user typed.
          if (open) setQuery(next);
        }}
        open={open}
        onOpenChange={(next) => {
          if (next) {
            restoreFocus.current = false;
            setQuery("");
            setOpen(true);
            return;
          }
          setOpen(false);
          setQuery("");
        }}
        multiple={multiple}
        disabled={disabled}
        autoHighlight="always"
        filter={null}
        itemToStringValue={(value) => labelFor(value)}
        style={{ display: "flex", flexDirection: "column", width: "100%" }}
      >
        {children}
      </HeadlessCombobox>
    </ComboboxContext.Provider>
  );
};

/** {@link ComboboxTrigger} props. */
export interface ComboboxTriggerProps extends Omit<
  HeadlessTriggerProps,
  "children"
> {
  /** Shown while nothing is selected. Default `"Select…"`. */
  readonly placeholder?: string;
  /** The trigger's accessible name. */
  readonly label?: string;
  /** Default `"combobox-trigger"`. */
  readonly testId?: string;
}

/** The closed control: the selected labels, the caret and `aria-expanded`. */
export const ComboboxTrigger = ({
  placeholder = "Select…",
  label,
  testId = "combobox-trigger",
  ...rest
}: ComboboxTriggerProps) => {
  const theme = useTheme();
  const { selectedValues, open, disabled, labelFor, registerTrigger } =
    useCombobox();
  const display =
    selectedValues.length === 0
      ? placeholder
      : Arr.join(
          Arr.map(selectedValues, (value) => labelFor(value)),
          ", ",
        );

  return (
    <HeadlessTrigger
      {...(label === undefined ? {} : { "aria-label": label })}
      aria-expanded={open}
      ref={registerTrigger}
      testId={testId}
      disabled={disabled}
      {...rest}
      style={{
        ...textStyle(theme, "label"),
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: theme.spacing.md,
        width: "100%",
        height: controlHeight(theme, "md"),
        paddingLeft: theme.spacing.md,
        paddingRight: theme.spacing.md,
        backgroundColor: theme.colors.background,
        color:
          selectedValues.length === 0
            ? theme.colors.mutedForeground
            : theme.colors.foreground,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.borderStrong,
        borderRadius: theme.radius.md,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        hover: disabled ? undefined : { backgroundColor: theme.colors.hover },
      }}
    >
      <text
        style={{
          ...textStyle(theme, "label"),
          color:
            selectedValues.length === 0
              ? theme.colors.mutedForeground
              : theme.colors.foreground,
        }}
      >
        {display}
      </text>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        ▾
      </text>
    </HeadlessTrigger>
  );
};

/** {@link ComboboxContent} props: the anchored popup surface. */
export interface ComboboxContentProps extends FloatingContentProps {
  /** Default `"bottom"`. */
  readonly side?: "top" | "right" | "bottom" | "left";
  /** Default `"start"`. */
  readonly align?: "start" | "center" | "end";
  /** The gap between trigger and surface. Default `4`. */
  readonly sideOffset?: number;
}

/** The popup. It renders while the combobox is open, anchored by GPUix. */
export const ComboboxContent = ({
  side = "bottom",
  align = "start",
  sideOffset = 4,
  children,
  onMouseDownOutside,
  style,
  ...rest
}: ComboboxContentProps) => {
  const theme = useTheme();
  const { noteOutsidePress } = useCombobox();

  return (
    <HeadlessContent
      testId="combobox-content"
      side={side}
      align={align}
      sideOffset={sideOffset}
      {...rest}
      onMouseDownOutside={(event) => {
        noteOutsidePress();
        onMouseDownOutside?.(event);
      }}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing["2xs"],
          minWidth: 220,
          maxHeight: 280,
          overflowY: "scroll",
          padding: theme.spacing.xs,
          backgroundColor: theme.colors.popover,
          color: theme.colors.popoverForeground,
          borderRadius: theme.radius.md,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          boxShadow: elevationShadow(theme, "md"),
          pointerEvents: "auto",
        },
        style,
      )}
    >
      {children}
    </HeadlessContent>
  );
};

/** {@link ComboboxInput} props. */
export interface ComboboxInputProps {
  /** Default `"Search…"`. */
  readonly placeholder?: string;
  /** The field's accessible name. Default `"Search options"`. */
  readonly label?: string;
}

/** The search field. Escape asks the root to return focus to the trigger. */
export const ComboboxInput = ({
  placeholder = "Search…",
  label = "Search options",
}: ComboboxInputProps) => {
  const theme = useTheme();
  const { noteEscape } = useCombobox();

  return (
    <HeadlessInput
      testId="combobox-input"
      placeholder={placeholder}
      aria-label={label}
      onKeyDown={(event) => {
        if (isDismiss(event)) noteEscape();
      }}
      style={{
        ...textStyle(theme, "body"),
        height: controlHeight(theme, "sm"),
        paddingLeft: theme.spacing.md,
        paddingRight: theme.spacing.md,
        backgroundColor: theme.colors.input,
        color: theme.colors.inputForeground,
        borderRadius: theme.radius.sm,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
      }}
    />
  );
};

/** {@link ComboboxList} props. */
export interface ComboboxListProps extends Omit<HeadlessListProps, "children"> {
  /** The listbox's accessible name. Default `"Options"`. */
  readonly label?: string;
}

/** The listbox: one {@link ComboboxItem} per visible option, in ranked order. */
export const ComboboxList = ({
  label = "Options",
  style,
  ...rest
}: ComboboxListProps) => {
  return (
    <HeadlessList
      role="listbox"
      aria-label={label}
      {...rest}
      style={mergeStyles({ display: "flex", flexDirection: "column" }, style)}
    >
      {(item) => <ComboboxItem key={item} value={item} />}
    </HeadlessList>
  );
};

/** {@link ComboboxItem} props. */
export interface ComboboxItemProps {
  /** The option's value. The label and description are read from the root. */
  readonly value: string;
  /** Merged after the row's own state style. */
  readonly style?: StyleDesc;
}

/** One option row: label, description and the selected mark. */
export const ComboboxItem = ({ value, style }: ComboboxItemProps) => {
  const theme = useTheme();
  const { options, selectedValues, labelFor, isDisabled } = useCombobox();
  const option = optionOf(options, value);
  const selected = Arr.contains(selectedValues, value);

  return (
    <HeadlessItem
      value={value}
      role="option"
      aria-selected={selected}
      disabled={isDisabled(value)}
      testId={`combobox-option-${value}`}
      style={(state) =>
        mergeStyles(rowStyle(theme, state), style) ?? rowStyle(theme, state)
      }
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          minWidth: 0,
          gap: theme.spacing["2xs"],
        }}
      >
        <text
          style={{
            ...textStyle(theme, "label"),
            color: theme.colors.popoverForeground,
          }}
        >
          {labelFor(value)}
        </text>
        {Option.match(option, {
          onNone: () => null,
          onSome: (candidate) =>
            candidate.description === undefined ? null : (
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: theme.colors.mutedForeground,
                }}
              >
                {candidate.description}
              </text>
            ),
        })}
      </div>
      {selected ? (
        <text
          aria-label="Selected"
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.primary,
          }}
        >
          ✓
        </text>
      ) : null}
    </HeadlessItem>
  );
};

/** {@link ComboboxEmpty} props. */
export interface ComboboxEmptyProps {
  readonly children?: ReactNode;
}

/** GPUix's empty slot: shown only while no option matches the query. */
export const ComboboxEmpty = ({ children }: ComboboxEmptyProps) => {
  const theme = useTheme();

  return (
    <HeadlessEmpty testId="combobox-empty">
      {children ?? (
        <text
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.mutedForeground,
            paddingTop: theme.spacing.lg,
            paddingBottom: theme.spacing.lg,
          }}
        >
          No matches
        </text>
      )}
    </HeadlessEmpty>
  );
};

export type { ComboboxOption } from "./combobox/logic.js";

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const comboboxMeta = {
  name: "Comboboxes",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "GPUix's filter is order-preserving, so the adapter feeds it pre-ranked items and controls inputValue",
    "selection yields option values, never labels",
    "no aria-activedescendant in 0.10.0: the highlighted row is visual while the input keeps focus",
    "no async options or create-new-option affordance in v1",
  ],
  docs: "docs/combobox.mdx",
  example: "examples/combobox.example.tsx",
  testFile: "src/behaviour/combobox.test.tsx",
} as const;
