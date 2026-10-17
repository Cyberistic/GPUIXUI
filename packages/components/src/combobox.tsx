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
 * copy. The trigger label, the ranking and the selection payload are ours.
 */

import {
  Combobox as HeadlessCombobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  type ComboboxItemState,
  type ComboboxValue,
} from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance, StyleDesc } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useLayoutEffect, useRef, useState } from "react";
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

/** {@link Combobox} props. */
export interface ComboboxProps {
  readonly options: ReadonlyArray<ComboboxOption>;
  /** The controlled selection. `undefined` means uncontrolled. */
  readonly value?: string | ReadonlyArray<string>;
  readonly defaultValue?: string | ReadonlyArray<string>;
  readonly onValueChange?: (value: ComboboxSelection) => void;
  /** Default `false`: one value and the popup closes on select. */
  readonly multiple?: boolean;
  /** Shown on the trigger when nothing is selected. Default `"Select…"`. */
  readonly placeholder?: string;
  /** The search field's placeholder. Default `"Search…"`. */
  readonly searchPlaceholder?: string;
  /** Shown when the query matches nothing. Default `"No matches"`. */
  readonly emptyLabel?: string;
  readonly disabled?: boolean;
  /** The trigger's accessible name. */
  readonly label?: string;
  /** The trigger's test id. Default `"combobox-trigger"`. */
  readonly testId?: string;
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

/** The label for a stored value; falls back to the value itself. */
const labelFor = (
  options: ReadonlyArray<ComboboxOption>,
  value: string,
): string =>
  Option.match(optionOf(options, value), {
    onNone: () => value,
    onSome: labelOf,
  });

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

/** A searchable single- or multi-select. */
export const Combobox = ({
  options,
  value: valueProp,
  defaultValue,
  onValueChange,
  multiple = false,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyLabel = "No matches",
  disabled = false,
  label,
  testId = "combobox-trigger",
}: ComboboxProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const trigger = useRef<PublicInstance | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
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

  const display =
    selectedValues.length === 0
      ? placeholder
      : Arr.join(
          Arr.map(selectedValues, (value) => labelFor(options, value)),
          ", ",
        );

  const visible = filterOptions(options, query);
  const items = Arr.map(visible, (option) => option.value);

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
      itemToStringValue={(value) => labelFor(options, value)}
      style={{ display: "flex", flexDirection: "column", width: "100%" }}
    >
      <ComboboxTrigger
        {...(label === undefined ? {} : { "aria-label": label })}
        aria-expanded={open}
        ref={trigger}
        testId={testId}
        disabled={disabled}
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
      </ComboboxTrigger>
      <ComboboxContent
        testId="combobox-content"
        side="bottom"
        align="start"
        sideOffset={4}
        onMouseDownOutside={() => {
          restoreFocus.current = false;
        }}
        style={{
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
        }}
      >
        <ComboboxInput
          testId="combobox-input"
          placeholder={searchPlaceholder}
          aria-label={label ?? "Search options"}
          onKeyDown={(event) => {
            if (isDismiss(event)) restoreFocus.current = true;
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
        <ComboboxList
          role="listbox"
          aria-label={label ?? "Options"}
          style={{ display: "flex", flexDirection: "column" }}
        >
          {(item) => {
            const option = optionOf(options, item);
            const disabledItem = Option.exists(
              option,
              (candidate) => candidate.disabled === true,
            );
            return (
              <ComboboxItem
                key={item}
                value={item}
                role="option"
                aria-selected={Arr.contains(selectedValues, item)}
                disabled={disabledItem}
                testId={`combobox-option-${item}`}
                style={(state) => rowStyle(theme, state)}
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
                    {labelFor(options, item)}
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
                {Arr.contains(selectedValues, item) ? (
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
              </ComboboxItem>
            );
          }}
        </ComboboxList>
        <ComboboxEmpty testId="combobox-empty">
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.mutedForeground,
              paddingTop: theme.spacing.lg,
              paddingBottom: theme.spacing.lg,
            }}
          >
            {emptyLabel}
          </text>
        </ComboboxEmpty>
      </ComboboxContent>
    </HeadlessCombobox>
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
