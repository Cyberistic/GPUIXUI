/**
 * `Select` — one choice from a list, in a popover.
 *
 * GPUix 0.10.0 already ships a headless, shadcn-shaped Select (plan 020 §1.5),
 * so this is a **themed wrapper, not a reimplementation**: the trigger wears the
 * same field chrome as `Input`, the list is the popover surface, and an item's
 * paint comes from the state GPUix reports (`selected`, `highlighted`,
 * `disabled`). The open state, dismissal and arrow navigation stay GPUix's.
 *
 * Placement is the one thing the wrapper must decide: the runtime's layer is
 * `side="bottom"` and `fit="snap"`, and snap **clamps without flipping**
 * (measured, plan 156 §8), so a select at the window's bottom edge opened its
 * list over the trigger (plan 066). The trigger's measured box and the list's
 * estimated height choose the side; an explicit `side` always wins.
 *
 * The options are data rather than compound children because the trigger needs
 * their labels; the `SelectItem` composition below is the shadcn escape hatch
 * for anything the data shape cannot express.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { useGpuix, useWindowSize } from "@gpuix/react";
import type { PublicInstance, StyleDesc } from "@gpuix/react";
import type { FloatingSide } from "@gpuix/react/floating";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  Select as GpuixSelect,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  type SelectItemState,
  type SelectTriggerState as GpuixSelectTriggerState,
} from "@gpuix/react/select";
import {
  isSelectGroup,
  selectOptions,
  selectRowCounts,
  type SelectEntry,
  type SelectOption,
  type SelectOptionGroup,
} from "../core/select.js";
import {
  controlFocusStyle,
  controlStyle,
  surfaceStyle,
  type ControlSpec,
} from "../core/style.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { fieldVariant } from "../core/variants.js";
import {
  availableOn,
  decideVerticalSide,
  FLOATING_MARGIN,
  type PlacementRequest,
} from "../core/floating.js";
import {
  mergeStyle,
  resolvePartStyle,
  useControlState,
  useFocus,
  type FocusState,
  type StateStyle,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export type { SelectEntry, SelectOption, SelectOptionGroup };

/** The public state a `Select` trigger's style callback receives. */
export interface SelectTriggerState extends GpuixSelectTriggerState {
  /** Whether the visible trigger itself holds native focus. */
  readonly focused: boolean;
}

/** The public state a `Select` style callback receives. */
export interface SelectState {
  readonly open: boolean;
  readonly disabled: boolean;
  readonly invalid: boolean;
}

export interface SelectProps {
  /**
   * Choices in paint order. A group paints a heading and its options; the
   * heading is not selectable, and option values stay unique across groups.
   */
  readonly options: ReadonlyArray<SelectEntry>;
  /** Controlled selection. Omit to let the select hold its own. */
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  /** Validation failed: the trigger's border takes the destructive role. */
  readonly invalid?: boolean;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  readonly fullWidth?: boolean;
  /** Which side the list opens on. Omit to let the wrapper pick the side with room. */
  readonly side?: FloatingSide;
  /** Accessible name. The visible name goes in a `Label` beside it. */
  readonly label?: string;
  /** An object, or a callback over the select's public state. */
  readonly style?: StateStyle<SelectState>;
  /**
   * An object, or a callback over the visible trigger's own state. Merged last
   * on the trigger's field chrome.
   */
  readonly triggerStyle?: StateStyle<SelectTriggerState>;
  readonly testId?: string;
}

/** The trigger is the field chrome with the value pushed to the far edge. */
export const selectTriggerStyle =
  (
    spec: ControlSpec,
    theme: PrimitiveTheme,
  ): ((state: SelectTriggerState) => StyleDesc) =>
  (state) => {
    const resolved = { ...spec, disabled: state.disabled };
    const active = state.disabled !== true && (state.focused || state.open);
    return mergeStyle(
      mergeStyle(
        controlStyle(resolved, theme),
        active ? controlFocusStyle(resolved, theme) : undefined,
      ),
      { justifyContent: "space-between" },
    );
  };

/** The trigger's paint with a caller's contribution merged last. */
export const selectTriggerPartStyle =
  (
    spec: ControlSpec,
    theme: PrimitiveTheme,
    focused: boolean,
    style?: StateStyle<SelectTriggerState>,
  ): ((state: GpuixSelectTriggerState) => StyleDesc) =>
  (state) => {
    const resolved: SelectTriggerState = { ...state, focused };
    return resolvePartStyle(
      selectTriggerStyle(spec, theme)(resolved),
      style,
      resolved,
    );
  };
/**
 * The list: the popover surface, one step of padding, at least as wide as the
 * trigger, and capped when the options do not fit the window.
 *
 * `minWidth` is the trigger's measured width. A percentage cannot express it:
 * `minWidth: "100%"` resolves against the anchored layer, not the trigger,
 * which painted a 57 px list under a 900 px field (plan 062 §0).
 *
 * `maxHeight` is the free space on the chosen side; the content then scrolls,
 * because the runtime clamps an over-tall layer against the window with no way
 * to reach its far end (measured: a 30-option list painted 908 px from y 8 and
 * left the last option at y 888 in an 800 px window — plan 068).
 */
export const selectContentStyle = (
  theme: PrimitiveTheme,
  minWidth?: number,
  maxHeight?: number,
): StyleDesc => ({
  ...surfaceStyle(
    { tone: "popover", radius: "md", border: true, elevation: "overlay" },
    theme,
  ),
  padding: theme.spacing.xs,
  gap: theme.spacing["2xs"],
  ...(minWidth === undefined ? {} : { minWidth }),
  ...(maxHeight === undefined
    ? {}
    : { maxHeight, overflowY: "scroll" as const }),
});

/** An item's paint, from the three states the runtime reports. */
export const selectItemStyle =
  (theme: PrimitiveTheme): ((state: SelectItemState) => StyleDesc) =>
  (state) => ({
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
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

/**
 * A group's heading row.
 *
 * The caption role on the muted foreground, inset like an option so the heading
 * and the rows share a left edge. It is not interactive, so it carries no state
 * resolver — the runtime has no `aria-labelledby`, and the group wrapper below
 * carries the name instead.
 */
export const selectHeadingStyle = (theme: PrimitiveTheme): StyleDesc => ({
  paddingLeft: theme.spacing.sm,
  paddingRight: theme.spacing.sm,
  paddingTop: theme.spacing["2xs"],
  paddingBottom: theme.spacing["2xs"],
  fontSize: theme.typography.caption.fontSize,
  lineHeight: theme.typography.caption.lineHeight,
  fontWeight: theme.typography.caption.fontWeight,
  color: theme.colors.mutedForeground,
  flexShrink: 0,
});

/**
 * A group's box: a column with the list's own gap, so a grouped list keeps the
 * spacing it had before it was grouped. The height estimate counts one gap
 * between every pair of painted rows, which is exactly what this produces
 * across group boundaries.
 */
export const selectGroupStyle = (theme: PrimitiveTheme): StyleDesc => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing["2xs"],
  flexShrink: 0,
});

/** The height a group heading paints, from the values its style uses. */
export const selectHeadingHeight = (theme: PrimitiveTheme): number =>
  theme.typography.caption.lineHeight + 2 * theme.spacing["2xs"];

/**
 * The height the list will paint, from the values its three styles use.
 *
 * The side must be chosen before the list exists, so the height is derived:
 * the surface's padding and gaps plus one `controlHeight.sm` row per option,
 * one caption row per non-empty group, and its border. `selectListHeight` sits
 * beside those styles and a test pins all of them together, so a restyle that
 * forgets this estimate fails (plans 066, 075).
 */
export const selectListHeight = (
  optionCount: number,
  theme: PrimitiveTheme,
  headingCount = 0,
): number => {
  const options = Math.max(optionCount, 0);
  const headings = Math.max(headingCount, 0);
  const rows = options + headings;
  return (
    2 * theme.spacing.xs +
    options * theme.density.controlHeight.sm +
    headings * selectHeadingHeight(theme) +
    Math.max(rows - 1, 0) * theme.spacing["2xs"] +
    2 * theme.borderWidth.thin
  );
};

/** The placement the wrapper has already resolved for the list. */
export interface SelectPlacement {
  /** The trigger's measured width, so the list is never narrower. */
  readonly minWidth?: number;
  /** The side the list opens on. Absent lets the runtime place it. */
  readonly side?: FloatingSide;
  /** The gap kept between the list and the window edge. */
  readonly collisionPadding: number;
  /** The free space on that side, when the list is taller than it. */
  readonly maxHeight?: number;
}

/** What the renderer does with the wrapper's own state. */
export interface SelectHandlers {
  readonly onOpenChange: (open: boolean) => void;
  readonly onValueChange: (value: string) => void;
  /** The trigger's host instance, so the wrapper can measure its width. */
  readonly registerTrigger: (instance: PublicInstance | null) => void;
  /** An option's host instance, keyed by value, so its row can be scrolled. */
  readonly registerItem: (
    value: string,
  ) => (instance: PublicInstance | null) => void;
  /** Called with the value of the option that became highlighted. */
  readonly onHighlight: (value: string) => void;
}

/**
 * Scrolls a newly highlighted option into view; renders nothing.
 *
 * Mounted only while its item is highlighted, so the effect fires once per
 * highlight change and not on unrelated re-renders. `scrollIntoView` is the
 * renderer's own API: it walks to the nearest scroll container, so a list that
 * fits is left alone.
 */
const ScrollWhenHighlighted = ({
  value,
  onHighlight,
}: {
  readonly value: string;
  readonly onHighlight: (value: string) => void;
}): null => {
  useEffect(() => onHighlight(value), [value, onHighlight]);
  return null;
};

/** The element tree `Select` renders. Pure in its arguments. */
export const renderSelect = (
  {
    options,
    placeholder,
    disabled,
    invalid,
    size = "md",
    fullWidth,
    label,
    style,
    triggerStyle,
    testId,
  }: SelectProps,
  theme: PrimitiveTheme,
  state: ValueState<string>,
  open: boolean,
  focus: FocusState,
  handlers: SelectHandlers,
  placement: SelectPlacement = { collisionPadding: FLOATING_MARGIN },
): ReactElement => {
  const spec: ControlSpec = { variant: fieldVariant, size, invalid, fullWidth };
  const flat = selectOptions(options);
  const selected = state.current === "" ? undefined : state.current;
  const selectedLabel = Option.getOrElse(
    Option.map(
      Arr.findFirst(flat, (option) => option.value === selected),
      (option) => option.label,
    ),
    () => undefined,
  );
  const items = Arr.map(flat, (option) => ({
    value: option.value,
    label: option.label,
    textValue: option.label,
    disabled: option.disabled === true,
  }));
  const row = (choice: SelectOption): ReactElement => (
    <SelectItem
      key={choice.value}
      ref={handlers.registerItem(choice.value)}
      value={choice.value}
      role="option"
      aria-label={choice.label}
      aria-selected={choice.value === selected}
      disabled={choice.disabled}
      style={selectItemStyle(theme)}
    >
      {(state) => (
        <>
          {state.highlighted ? (
            <ScrollWhenHighlighted
              value={choice.value}
              onHighlight={handlers.onHighlight}
            />
          ) : null}
          {choice.label}
        </>
      )}
    </SelectItem>
  );
  return (
    <GpuixSelect
      items={items}
      value={selected}
      onValueChange={handlers.onValueChange}
      onOpenChange={handlers.onOpenChange}
      disabled={disabled}
      testId={testId}
      style={resolvePartStyle(
        { width: fullWidth === true ? "100%" : undefined },
        style,
        {
          open,
          disabled: disabled === true,
          invalid: invalid === true,
        },
      )}
    >
      <SelectTrigger
        ref={handlers.registerTrigger}
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-valuetext={selectedLabel ?? placeholder}
        disabled={disabled}
        testId={testId === undefined ? undefined : `${testId}-trigger`}
        onFocus={focus.onFocus}
        onBlur={focus.onBlur}
        style={selectTriggerPartStyle(spec, theme, focus.focused, triggerStyle)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        role="listbox"
        aria-label={label}
        side={placement.side}
        collisionPadding={placement.collisionPadding}
        style={selectContentStyle(
          theme,
          placement.minWidth,
          placement.maxHeight,
        )}
      >
        {Arr.map(options, (entry, index) =>
          isSelectGroup(entry) ? (
            <SelectGroup
              key={`${index}-${entry.label}`}
              role="group"
              aria-label={entry.label}
              style={selectGroupStyle(theme)}
            >
              <SelectLabel style={selectHeadingStyle(theme)}>
                {entry.label}
              </SelectLabel>
              {Arr.map(entry.options, row)}
            </SelectGroup>
          ) : (
            row(entry)
          ),
        )}
      </SelectContent>
    </GpuixSelect>
  );
};

/** The trigger's measured box, as the side decision needs it. */
interface TriggerBox {
  readonly width: number;
  readonly top: number;
  readonly bottom: number;
}

/** A list of options in a popover. */
export const Select = (props: SelectProps): ReactElement => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  const viewport = useWindowSize();
  const [open, setOpen] = useState(false);
  const focus = useFocus();
  const [triggerBox, setTriggerBox] = useState<TriggerBox | undefined>(
    undefined,
  );
  const trigger = useRef<number | null>(null);
  const items = useRef<Map<string, number>>(new Map());
  const state = useControlState(
    props.value,
    props.defaultValue ?? "",
    props.onValueChange,
  );
  /**
   * The renderer scrolls a highlighted row into its nearest scroll container.
   *
   * Stable across renders so a highlighted row is not scrolled again on an
   * unrelated re-render, which would fight a user's wheel scroll. Keyed by the
   * option's value, not its position: a heading between options makes the two
   * differ.
   */
  const scrollToOption = useCallback(
    (value: string) => {
      Option.match(Option.fromNullishOr(items.current.get(value)), {
        onNone: () => {},
        onSome: (id) => renderer?.scrollIntoView?.(id),
      });
    },
    [renderer],
  );
  useEffect(() => {
    const id = trigger.current;
    if (id === null) return;
    const bounds = renderer?.getElementBounds?.(id);
    if (bounds === null || bounds === undefined || bounds.width <= 0) return;
    setTriggerBox({
      width: bounds.width,
      top: bounds.y,
      bottom: bounds.y + bounds.height,
    });
  }, [renderer, open, props.size, props.fullWidth, viewport.height]);
  const counts = selectRowCounts(props.options);
  const request = Option.map(
    Option.fromNullishOr(triggerBox),
    (box): PlacementRequest => ({
      triggerTop: box.top,
      triggerBottom: box.bottom,
      layerHeight: selectListHeight(counts.options, theme, counts.headings),
      viewportHeight: viewport.height,
      margin: FLOATING_MARGIN,
    }),
  );
  const side =
    props.side ??
    Option.getOrUndefined(Option.map(request, decideVerticalSide));
  const verticalSide = side === "top" || side === "bottom" ? side : undefined;
  const maxHeight = Option.getOrUndefined(
    Option.flatMap(request, (measurement) => {
      if (verticalSide === undefined) return Option.none();
      const space = availableOn(measurement, verticalSide);
      return measurement.layerHeight > space
        ? Option.some(Math.max(space, 0))
        : Option.none();
    }),
  );
  return renderSelect(
    props,
    theme,
    state.value,
    open,
    focus,
    {
      onOpenChange: setOpen,
      onValueChange: state.set,
      registerTrigger: (instance) => {
        trigger.current = instance?.id ?? null;
      },
      registerItem: (value) => (instance) => {
        if (instance === null) items.current.delete(value);
        else items.current.set(value, instance.id);
      },
      onHighlight: scrollToOption,
    },
    {
      minWidth: triggerBox?.width,
      side,
      collisionPadding: FLOATING_MARGIN,
      maxHeight,
    },
  );
};
