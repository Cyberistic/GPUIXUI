/**
 * `Select` — one choice from a list, in a popover.
 *
 * GPUix 0.11.0 already ships a headless, shadcn-shaped Select (plan 020 §1.5),
 * so this is a **themed wrapper, not a reimplementation**: the trigger wears the
 * same field chrome as `Input`, the list is the popover surface, and an item's
 * paint comes from the state GPUix reports (`selected`, `highlighted`,
 * `disabled`). The open state, dismissal and arrow navigation stay GPUix's.
 *
 * The options are data rather than compound children because the trigger needs
 * their labels; the `SelectItem` composition below is the shadcn escape hatch
 * for anything the data shape cannot express.
 *
 * The resting appearance is a Tailwind recipe (`recipe/selectTriggerClass`,
 * `recipe/selectContentClass`, `recipe/selectItemClass`), compiled through
 * `@gpuixui/tw`.
 */

import { Fragment, type ReactElement } from "react";
import type { StyleDesc } from "@gpuix/react";
import {
  resolveStyle,
  type FloatingSide,
  type StateStyle,
} from "@gpuix/react/floating";
import * as Arr from "effect/Array";
import {
  Select as GpuixSelect,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  type SelectItemState,
  type SelectTriggerState,
} from "@gpuix/react/select";
import { accessibleName } from "../core/a11y.js";
import { controlRing } from "../core/focus.js";
import type { ControlSpec } from "../core/style.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { fieldVariant } from "../core/variants.js";
import { Icon } from "@gpuixui/icons";
import {
  selectContentClass,
  selectItemClass,
  selectItemRowClass,
  selectLabelClass,
  selectSeparatorClass,
  selectTriggerClass,
} from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import {
  mergeStyle,
  suppressFeedback,
  valueChange,
  type ValueChangeProps,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/** The trigger and item states GPUix reports; the style callbacks receive them. */
export type { SelectItemState, SelectTriggerState };

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

/** A named run of options, painted under a caption and a rule. */
export interface SelectOptionGroup {
  readonly label: string;
  readonly options: ReadonlyArray<SelectOption>;
}

/** One entry in the list: an option, or a named group of them. */
export type SelectEntry = SelectOption | SelectOptionGroup;

/** Whether an entry is a named group rather than one option. */
export const isSelectGroup = (entry: SelectEntry): entry is SelectOptionGroup =>
  "options" in entry;

/** Every option in render order, with the groups flattened. */
export const selectOptions = (
  entries: ReadonlyArray<SelectEntry>,
): ReadonlyArray<SelectOption> =>
  Arr.flatMap(entries, (entry) =>
    isSelectGroup(entry) ? entry.options : [entry],
  );

export interface SelectProps extends ValueChangeProps<string> {
  /**
   * The list: options, or named groups of them. A group's caption is a visual
   * heading — 0.11.0's `SelectGroup` has no role to announce it — so keep the
   * names short and unique.
   */
  readonly options: ReadonlyArray<SelectEntry>;
  /** Controlled selection. Omit to let the select hold its own. */
  readonly value?: string;
  readonly defaultValue?: string;
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
  /** Extra style on the wrapper, which paints nothing but its width. */
  readonly style?: StyleDesc;
  /** Extra style for the trigger, resolved against its own live state. */
  readonly triggerStyle?: StateStyle<SelectTriggerState>;
  /** Extra style for every option, resolved against that option's state. */
  readonly itemStyle?: StateStyle<SelectItemState>;
  /**
   * Stable locator for the root, which paints nothing but the wrapper's width.
   * Press the control through `triggerTestId`: the root is not the trigger.
   */
  readonly testId?: string;
  /** Stable locator for the trigger, the element that opens the list. */
  readonly triggerTestId?: string;
  /**
   * Stable locator for an option row, derived from its value — rows are data,
   * so one string cannot name them.
   */
  readonly itemTestId?: (value: string) => string;
}

/** The trigger is the field chrome with the value pushed to the far edge. */
export const selectTriggerStyle = (
  spec: ControlSpec,
  theme: PrimitiveTheme,
  caller?: StateStyle<SelectTriggerState>,
): ((state: SelectTriggerState) => StyleDesc) => {
  const resolved = recipeTw.classesToStyle(
    selectTriggerClass({
      size: spec.size,
      invalid: spec.invalid,
      fullWidth: spec.fullWidth,
    }),
    theme,
  );
  return (state) => {
    let style = resolved.style;
    if (spec.invalid === true) style = mergeStyle(style, resolved.invalid);
    if (state.disabled === true) {
      style = suppressFeedback(mergeStyle(style, resolved.disabled));
    } else {
      style = mergeStyle(style, controlRing(theme, { invalid: spec.invalid }));
    }
    return mergeStyle(style, resolveStyle(caller, state));
  };
};

/**
 * The list: the popover surface, one step of padding, full trigger width.
 *
 * A long list must be reachable, and the runtime's content sets no bound of its
 * own (its edge-scroll parts are empty in 0.11.0), so the surface caps at the
 * menus' 320px and scrolls. The wheel moves it; an arrow does not reveal its own
 * row — the runtime never scrolls the highlight into view — so a keyboard user
 * with more options than fit still cannot reach the tail (`select.mdx` records
 * it as the remaining gap).
 */
export const selectContentStyle = (theme: PrimitiveTheme): StyleDesc =>
  mergeStyle(recipeTw.classesToStyle(selectContentClass, theme).style, {
    maxHeight: 320,
    overflowY: "scroll",
  });

/** A group caption: the caption role, muted, above its rows. */
export const selectLabelStyle = (theme: PrimitiveTheme): StyleDesc =>
  recipeTw.classesToStyle(selectLabelClass, theme).style;

/** The rule between two groups. */
export const selectSeparatorStyle = (theme: PrimitiveTheme): StyleDesc =>
  recipeTw.classesToStyle(selectSeparatorClass, theme).style;

/** An item's paint, from the three states the runtime reports. */
export const selectItemStyle =
  (
    theme: PrimitiveTheme,
    caller?: StateStyle<SelectItemState>,
  ): ((state: SelectItemState) => StyleDesc) =>
  (state) =>
    mergeStyle(
      recipeTw.classesToStyle(selectItemClass(state), theme).style,
      resolveStyle(caller, state),
    );

/** The element tree `Select` renders. Pure in its arguments. */
export const renderSelect = (
  {
    options,
    value,
    defaultValue,
    onValueChange,
    onChange,
    placeholder,
    disabled,
    invalid,
    size = "md",
    fullWidth,
    side,
    label,
    style,
    triggerStyle,
    itemStyle,
    testId,
    triggerTestId,
    itemTestId,
  }: SelectProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const spec: ControlSpec = { variant: fieldVariant, size, invalid, fullWidth };
  const items = Arr.map(selectOptions(options), (option) => ({
    value: option.value,
    label: option.label,
    textValue: option.label,
    disabled: option.disabled === true,
  }));
  const renderItem = (option: SelectOption): ReactElement => (
    <SelectItem
      key={option.value}
      value={option.value}
      disabled={option.disabled}
      testId={itemTestId?.(option.value)}
      style={selectItemStyle(theme, itemStyle)}
    >
      {(state) => (
        <div style={recipeTw.classesToStyle(selectItemRowClass, theme).style}>
          {option.label}
          {/*
            The selected mark comes from the state GPUix reports for this row,
            so an uncontrolled Select needs no mirror of its value. It is
            decorative: the row is already `aria-selected`.
          */}
          {state.selected ? (
            <Icon
              name="check"
              size="sm"
              color={theme.colors.popoverForeground}
            />
          ) : null}
        </div>
      )}
    </SelectItem>
  );
  return (
    <GpuixSelect
      items={items}
      value={value}
      defaultValue={defaultValue}
      onValueChange={valueChange({ onValueChange, onChange })}
      disabled={disabled}
      aria-label={accessibleName(label)}
      testId={testId}
      style={mergeStyle(
        { width: fullWidth === true ? "100%" : undefined },
        style,
      )}
    >
      <SelectTrigger
        disabled={disabled}
        testId={triggerTestId}
        style={selectTriggerStyle(spec, theme, triggerStyle)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent side={side} style={selectContentStyle(theme)}>
        {Arr.map(options, (entry, index) =>
          isSelectGroup(entry) ? (
            <Fragment key={`group-${index}`}>
              {index === 0 ? null : (
                <SelectSeparator style={selectSeparatorStyle(theme)} />
              )}
              <SelectGroup>
                <SelectLabel style={selectLabelStyle(theme)}>
                  {entry.label}
                </SelectLabel>
                {/*
                  Spread, not nested: the parts helper walks a component's
                  children and flattens fragments, so an array left as one child
                  would hide every row of the group from a test (and from a
                  caller composing an item list).
                */}
                {...Arr.map(entry.options, renderItem)}
              </SelectGroup>
            </Fragment>
          ) : (
            renderItem(entry)
          ),
        )}
      </SelectContent>
    </GpuixSelect>
  );
};

/** A list of options in a popover. */
export const Select = (props: SelectProps): ReactElement =>
  renderSelect(props, useTheme());
