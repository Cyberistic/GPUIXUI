/**
 * `Select` — one choice from a list, in a popover.
 *
 * GPUix 0.11.0 already ships a headless, shadcn-shaped Select (see `docs/gpuix-capabilities.md`),
 * so this is a **themed wrapper, not a reimplementation**: the trigger wears the
 * same field chrome as `Input`, the list is the popover surface, and an item's
 * paint comes from the state GPUix reports (`selected`, `highlighted`,
 * `disabled`). The open state, dismissal and arrow navigation stay GPUix's.
 *
 * The options are data rather than compound children because the trigger needs
 * their labels, and an option is a value, a label and a disabled flag: there is
 * no richer row content and no compound `SelectItem` escape hatch.
 *
 * The resting appearance is a Tailwind recipe (`recipe/selectTriggerClass`,
 * `recipe/selectContentClass`, `recipe/selectItemClass`), compiled through
 * `@gpuixui/tw`.
 */

import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance, StyleDesc } from "@gpuix/react";
import {
  resolveStyle,
  type FloatingSide,
  type StateStyle,
} from "@gpuix/react/floating";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
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
import { controlRing, keepContent } from "../core/focus.js";
import { revealScroll } from "../core/scroll.js";
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

/**
 * A mutable seat for a native element, the shape React's own refs use.
 *
 * `renderSelect` is pure in its arguments, so it cannot create a ref; the
 * component creates one and the list and its rows share it.
 */
export interface PublicInstanceHolder {
  readonly current: PublicInstance | null;
}

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
    let style = mergeStyle(resolved.style, keepContent);
    // GPUix's `SelectValue` paints its fallback inside the trigger, so the
    // trigger's own colour is what a placeholder inherits. Without this an
    // empty select paints its hint in the value role and reads as chosen.
    if (state.placeholder === true) {
      style = mergeStyle(style, { color: theme.colors.placeholder });
    }
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
 * menus' 320px and scrolls. The wheel moves it; a highlighted row reveals itself
 * after commit (`RevealOnHighlight`), because the runtime never scrolls its own
 * highlight into view.
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

/**
 * One row's content: the label, the selected mark, and the row's announcement.
 *
 * 0.11.0's `SelectItem` is a plain `div` with no role, and a role-less element
 * never reaches the accessibility tree — so the content inside it carries the
 * row's `option` role, its name and the selected state. The state comes from
 * the callback GPUix hands this row, which is the only place it is reported, so
 * an uncontrolled Select still needs no mirror of its value.
 */
export const renderSelectRow = (
  option: SelectOption,
  theme: PrimitiveTheme,
  state: SelectItemState,
): ReactElement => (
  <div
    role="option"
    aria-label={accessibleName(option.label)}
    aria-selected={state.selected}
    style={recipeTw.classesToStyle(selectItemRowClass, theme).style}
  >
    {option.label}
    {/*
      The selected mark is decorative: the row's `aria-selected` is the state,
      so the glyph carries no second name.
    */}
    {state.selected ? (
      <Icon name="check" size="sm" color={theme.colors.popoverForeground} />
    ) : null}
  </div>
);

/**
 * Bring the row the keyboard moved onto into view.
 *
 * GPUix scrolls a list on the wheel but never moves it for its own highlight, so
 * a list taller than its 320px cap kept an unreachable tail: twenty ArrowDowns
 * left the offset where the wheel put it. The row is the only part that is told
 * `highlighted`, so it is the part that has to reveal itself — after commit,
 * because the runtime needs both elements' ids.
 *
 * The move is arithmetic over the two painted boxes (`core/scroll.ts`'s
 * `revealScroll`), not the renderer's `scrollIntoView`: that one scrolls a
 * scroller to the index of its **direct child**, so a row inside a `SelectGroup`
 * could only reveal its group.
 *
 * It renders its children unchanged: a fragment is transparent to the runtime's
 * part walk, exactly like the `ScrollArea` viewport's group.
 */
const RevealOnHighlight = ({
  highlighted,
  instance,
  scroller,
  children,
}: {
  readonly highlighted: boolean;
  readonly instance: PublicInstanceHolder;
  readonly scroller: PublicInstanceHolder;
  readonly children: ReactNode;
}): ReactElement => {
  const { renderer } = useGpuix();
  useLayoutEffect(() => {
    if (!highlighted || renderer === null) return;
    const row = instance.current;
    const viewport = scroller.current;
    if (row === null || viewport === null) return;
    const rowBox = renderer.getElementBounds?.(row.id);
    const viewportBox = renderer.getElementBounds?.(viewport.id);
    const current = renderer.getScrollOffset?.(viewport.id);
    if (!rowBox || !viewportBox || !current) return;
    const [x, y] = current;
    Option.match(revealScroll(rowBox, viewportBox, { x: x ?? 0, y: y ?? 0 }), {
      onNone: () => {},
      onSome: (next) => renderer.scrollTo?.(viewport.id, next.x, next.y),
    });
  }, [highlighted, instance, scroller, renderer]);
  return <>{children}</>;
};

/** One data-driven row: a themed `SelectItem` that reveals its own highlight. */
const SelectRow = ({
  option,
  theme,
  itemStyle,
  testId,
  scroller,
}: {
  readonly option: SelectOption;
  readonly theme: PrimitiveTheme;
  readonly itemStyle: StateStyle<SelectItemState> | undefined;
  readonly testId: string | undefined;
  readonly scroller: PublicInstanceHolder;
}): ReactElement => {
  const instance = useRef<PublicInstance | null>(null);
  // A stable callback: a fresh one detaches and re-attaches the item's ref on
  // every paint, which the accordion's rows already pay for.
  const attach = useCallback((next: PublicInstance | null) => {
    instance.current = next;
  }, []);
  return (
    <SelectItem
      ref={attach}
      value={option.value}
      disabled={option.disabled}
      testId={testId}
      style={selectItemStyle(theme, itemStyle)}
    >
      {(state) => (
        <RevealOnHighlight
          highlighted={state.highlighted}
          instance={instance}
          scroller={scroller}
        >
          {renderSelectRow(option, theme, state)}
        </RevealOnHighlight>
      )}
    </SelectItem>
  );
};

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
  scroller: PublicInstanceHolder = { current: null },
): ReactElement => {
  const spec: ControlSpec = { variant: fieldVariant, size, invalid, fullWidth };
  const items = Arr.map(selectOptions(options), (option) => ({
    value: option.value,
    label: option.label,
    textValue: option.label,
    disabled: option.disabled === true,
  }));
  const renderItem = (option: SelectOption): ReactElement => (
    <SelectRow
      key={option.value}
      option={option}
      theme={theme}
      itemStyle={itemStyle}
      testId={itemTestId?.(option.value)}
      scroller={scroller}
    />
  );
  return (
    <GpuixSelect
      items={items}
      value={value}
      defaultValue={defaultValue}
      onValueChange={valueChange({ onValueChange, onChange })}
      disabled={disabled}
      testId={testId}
      style={mergeStyle(
        { width: fullWidth === true ? "100%" : undefined },
        style,
      )}
    >
      <SelectTrigger
        disabled={disabled}
        testId={triggerTestId}
        // The trigger is the control, so it is what assistive technology must
        // see: a named `combobox`. GPUix renders it as a `div` with a tab stop
        // and no role, and a role-less node is absent from the accessibility
        // tree — measured on 0.11.0, a Select with a `label` produced no node
        // at all (the wrapper's `aria-label` landed on a plain `div`). The rows
        // announce themselves from inside GPUix's role-less item parts
        // (`renderSelectRow`).
        role="combobox"
        aria-label={accessibleName(label)}
        style={selectTriggerStyle(spec, theme, triggerStyle)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        ref={scroller}
        side={side}
        // The rows are `option` nodes, so their container is what holds them:
        // without the role the options would sit under the role-less floating
        // layer. The list is unnamed — the trigger is the named control — and
        // the role paints nothing, so the measured 320px surface is unchanged.
        role="listbox"
        style={selectContentStyle(theme)}
      >
        {Arr.map(options, (entry, index) =>
          isSelectGroup(entry) ? (
            <Fragment key={`group-${index}`}>
              {index === 0 ? null : (
                <SelectSeparator style={selectSeparatorStyle(theme)} />
              )}
              {/*
                The caption names the run it heads: 0.11.0's `SelectGroup` is a
                plain `div`, so the `group` role and the caption are what a
                reader hears before the group's options.
              */}
              <SelectGroup
                role="group"
                aria-label={accessibleName(entry.label)}
              >
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
  renderSelect(props, useTheme(), useRef<PublicInstance | null>(null));
