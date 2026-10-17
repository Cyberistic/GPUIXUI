/**
 * `Select` — one choice from a list, in a popover.
 *
 * GPUix 0.10.0 already ships a headless, shadcn-shaped Select (plan 020 §1.5),
 * so this is a **themed wrapper, not a reimplementation**: the trigger wears the
 * same field chrome as `Input`, the list is the popover surface, and an item's
 * paint comes from the state GPUix reports (`selected`, `highlighted`,
 * `disabled`). The open state, dismissal and arrow navigation stay GPUix's.
 *
 * The options are data rather than compound children because the trigger needs
 * their labels; the `SelectItem` composition below is the shadcn escape hatch
 * for anything the data shape cannot express.
 */

import { useEffect, useRef, useState, type ReactElement } from "react";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance, StyleDesc } from "@gpuix/react";
import type { FloatingSide } from "@gpuix/react/floating";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  Select as GpuixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type SelectItemState,
  type SelectTriggerState,
} from "@gpuix/react/select";
import { controlStyle, surfaceStyle, type ControlSpec } from "../core/style.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { fieldVariant } from "../core/variants.js";
import { mergeStyle, useControlState } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SelectProps {
  readonly options: ReadonlyArray<SelectOption>;
  /** Controlled selection. Omit to let the select hold its own. */
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onChange?: (value: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  /** Validation failed: the trigger's border takes the destructive role. */
  readonly invalid?: boolean;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  readonly fullWidth?: boolean;
  /** Which side the list opens on. GPUix picks when this is absent. */
  readonly side?: FloatingSide;
  /** Accessible name. The visible name goes in a `Label` beside it. */
  readonly label?: string;
  readonly style?: StyleDesc;
  readonly testId?: string;
}

/** The trigger is the field chrome with the value pushed to the far edge. */
export const selectTriggerStyle =
  (
    spec: ControlSpec,
    theme: PrimitiveTheme,
  ): ((state: SelectTriggerState) => StyleDesc) =>
  (state) =>
    mergeStyle(controlStyle({ ...spec, disabled: state.disabled }, theme), {
      justifyContent: "space-between",
    });

/**
 * The list: the popover surface, one step of padding, at least as wide as the
 * trigger.
 *
 * `minWidth` is the trigger's measured width. A percentage cannot express it:
 * `minWidth: "100%"` resolves against the anchored layer, not the trigger,
 * which painted a 57 px list under a 900 px field (plan 062 §0).
 */
export const selectContentStyle = (
  theme: PrimitiveTheme,
  minWidth?: number,
): StyleDesc => ({
  ...surfaceStyle(
    { tone: "popover", radius: "md", border: true, elevation: "overlay" },
    theme,
  ),
  padding: theme.spacing.xs,
  gap: theme.spacing["2xs"],
  ...(minWidth === undefined ? {} : { minWidth }),
});

/** An item's paint, from the three states the runtime reports. */
export const selectItemStyle =
  (theme: PrimitiveTheme): ((state: SelectItemState) => StyleDesc) =>
  (state) => ({
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    height: theme.density.controlHeight.sm,
    paddingLeft: theme.spacing.sm,
    paddingRight: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    color:
      state.disabled === true
        ? theme.colors.disabledForeground
        : theme.colors.popoverForeground,
    backgroundColor:
      state.disabled === true
        ? undefined
        : state.selected === true
          ? theme.colors.selected
          : state.highlighted === true
            ? theme.colors.hover
            : undefined,
    cursor: state.disabled === true ? "not-allowed" : "pointer",
  });

/** What the renderer does with the wrapper's own state. */
export interface SelectHandlers {
  readonly onOpenChange: (open: boolean) => void;
  readonly onValueChange: (value: string) => void;
  /** The trigger's host instance, so the wrapper can measure its width. */
  readonly registerTrigger: (instance: PublicInstance | null) => void;
}

/** The element tree `Select` renders. Pure in its arguments. */
export const renderSelect = (
  {
    options,
    placeholder,
    disabled,
    invalid,
    size = "md",
    fullWidth,
    side,
    label,
    style,
    testId,
  }: SelectProps,
  theme: PrimitiveTheme,
  state: ValueState<string>,
  open: boolean,
  handlers: SelectHandlers,
  triggerWidth?: number,
): ReactElement => {
  const spec: ControlSpec = { variant: fieldVariant, size, invalid, fullWidth };
  const selected = state.current === "" ? undefined : state.current;
  const selectedLabel = Option.getOrElse(
    Option.map(
      Arr.findFirst(options, (option) => option.value === selected),
      (option) => option.label,
    ),
    () => undefined,
  );
  const items = Arr.map(options, (option) => ({
    value: option.value,
    label: option.label,
    textValue: option.label,
    disabled: option.disabled === true,
  }));
  return (
    <GpuixSelect
      items={items}
      value={selected}
      onValueChange={handlers.onValueChange}
      onOpenChange={handlers.onOpenChange}
      disabled={disabled}
      testId={testId}
      style={mergeStyle(
        { width: fullWidth === true ? "100%" : undefined },
        style,
      )}
    >
      <SelectTrigger
        ref={handlers.registerTrigger}
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-valuetext={selectedLabel ?? placeholder}
        disabled={disabled}
        style={selectTriggerStyle(spec, theme)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        role="listbox"
        aria-label={label}
        side={side}
        style={selectContentStyle(theme, triggerWidth)}
      >
        {Arr.map(options, (option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            role="option"
            aria-label={option.label}
            aria-selected={option.value === selected}
            disabled={option.disabled}
            style={selectItemStyle(theme)}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </GpuixSelect>
  );
};

/** A list of options in a popover. */
export const Select = (props: SelectProps): ReactElement => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  const [open, setOpen] = useState(false);
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(
    undefined,
  );
  const trigger = useRef<number | null>(null);
  const state = useControlState(
    props.value,
    props.defaultValue ?? "",
    props.onChange,
  );
  useEffect(() => {
    const id = trigger.current;
    if (id === null) return;
    const bounds = renderer?.getElementBounds?.(id);
    if (bounds === null || bounds === undefined || bounds.width <= 0) return;
    setTriggerWidth(bounds.width);
  }, [renderer, open, props.size, props.fullWidth]);
  return renderSelect(
    props,
    theme,
    state.value,
    open,
    {
      onOpenChange: setOpen,
      onValueChange: state.set,
      registerTrigger: (instance) => {
        trigger.current = instance?.id ?? null;
      },
    },
    triggerWidth,
  );
};
