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
 * estimated height choose a vertical side; an explicit `top`/`bottom` is the
 * same rule's preference, so it flips when it cannot fit (plan 336).
 *
 * A list beside its trigger (`side="left"`/`"right"`) is capped to the window's
 * height and scrolls, because that axis is bounded by the window rather than by
 * the trigger (measured, plan 098). Its width is the room on the side it
 * actually opens, so a left-side list on a right-aligned trigger uses the left
 * half instead of the few pixels that remain on the right (plan `379`). That
 * side is a preference too: the trigger's
 * box and the list's measured width move it to the other side when it cannot fit
 * (measured, plan 335).
 *
 * The open state is the wrapper's, not the runtime's private copy: `open`,
 * `defaultOpen` and `onOpenChange` follow the package's one controlled rule
 * (`core/state.ts`), and a select that becomes **disabled** is closed — a menu
 * the user cannot choose from and the runtime will not commit is worse than no
 * menu (measured, plan 346). The chevron, the trigger ring, the root style
 * callback and the list all read that one value.
 *
 * The options are data rather than compound children because the trigger needs
 * their labels; the `SelectItem` composition below is the shadcn escape hatch
 * for anything the data shape cannot express.
 *
 * The trigger carries a **decorative chevron** (`renderSelectIndicator`), down
 * at rest and up while the list is open, because the runtime has no `transform`
 * to rotate one. It releases `justifyContent: "space-between"`'s reserved
 * trailing child and tells a user the field opens a list (plan `343`).
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { useGpuix, useWindowSize } from "@gpuix/react";
import type { PublicInstance, StyleDesc } from "@gpuix/react";
import type { FloatingSide } from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
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
  selectOpen,
  selectOptions,
  selectRowCounts,
  type SelectEntry,
  type SelectOption,
  type SelectOptionGroup,
} from "../core/select.js";
import { controlLabelStyle, surfaceStyle } from "../core/style.js";
import { fieldRecipeStyle, fieldRowStyle } from "../core/recipes.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import {
  availableOn,
  availableWidth,
  decideHorizontalSide,
  decideVerticalSide,
  FLOATING_MARGIN,
  isHorizontalSide,
  type HorizontalSide,
  type PlacementRequest,
  type VerticalSide,
} from "../core/floating.js";
import {
  ariaName,
  composeHandler,
  passiveTriggerHandlers,
  resolvePartStyle,
  useControlState,
  useFocus,
  type FocusState,
  type StateStyle,
  type TriggerHandlers,
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

export interface SelectProps extends TriggerHandlers {
  /**
   * Choices in paint order. A group paints a heading and its options; the
   * heading is not selectable, and option values stay unique across groups.
   */
  readonly options: ReadonlyArray<SelectEntry>;
  /** Controlled selection. Omit to let the select hold its own. */
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;
  /** Controlled open state. Omit to let the select hold its own. */
  readonly open?: boolean;
  /** Initial open state when uncontrolled. Defaults to closed. */
  readonly defaultOpen?: boolean;
  /** Called when the select asks to open or close. */
  readonly onOpenChange?: (open: boolean) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  /** Validation failed: the trigger's border takes the destructive role. */
  readonly invalid?: boolean;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  readonly fullWidth?: boolean;
  /**
   * Which side the list opens on. A requested side is a preference on both
   * axes: the list flips to the other side when it cannot fit, or to the roomier
   * one (plans 335, 336).
   */
  readonly side?: FloatingSide;
  /** Accessible name. The visible name goes in a `Label` beside it. */
  readonly label?: string;
  /** Extra description announced after the name. A slot (a `Tooltip`) writes the tip here. */
  readonly "aria-description"?: string;
  /** An object, or a callback over the select's public state. */
  readonly style?: StateStyle<SelectState>;
  /**
   * An object, or a callback over the visible trigger's own state. Merged last
   * on the trigger's field chrome.
   */
  readonly triggerStyle?: StateStyle<SelectTriggerState>;
  readonly testId?: string;
}

/** The trigger's trailing affordance: down at rest, up while the list is open. */
export interface SelectIndicatorProps {
  readonly open: boolean;
  readonly disabled: boolean;
  readonly testId?: string;
}

/**
 * The chevron that says "this field opens a list".
 *
 * Decoration, not content: no `label`, so it stays out of the accessibility
 * tree and cannot rename the combobox. The icon sets `pointerEvents: "none"`,
 * so a click inside it still reaches the trigger.
 */
export const renderSelectIndicator = (
  { open, disabled, testId }: SelectIndicatorProps,
  theme: PrimitiveTheme,
): ReactElement => (
  <Icon
    name={open ? "chevron-up" : "chevron-down"}
    size={theme.iconSize.sm}
    color={disabled ? theme.colors.placeholder : theme.colors.mutedForeground}
    testId={testId}
  />
);

/** What the trigger's chrome reads from the select's props. */
export interface SelectTriggerSpec {
  readonly invalid?: boolean;
  readonly fullWidth?: boolean;
}

/**
 * The trigger is the field chrome with the value pushed to the far edge.
 *
 * The field recipe is `w-full` (a browser form default); a select hugs its
 * value unless the consumer asks the root for `fullWidth`, so the trigger
 * clears that one property. The list's rows keep their own metrics — they are
 * not input fields (plan `372`). The recipe's text cursor and selectable text
 * belong to a native `<input>`, so the trigger overrides both: it is chrome
 * (plan `386`).
 */
export const selectTriggerStyle =
  (
    spec: SelectTriggerSpec,
    theme: PrimitiveTheme,
  ): ((state: SelectTriggerState) => StyleDesc) =>
  (state) => ({
    ...fieldRecipeStyle(
      {
        focused: state.focused || state.open,
        invalid: spec.invalid === true,
        disabled: state.disabled,
      },
      theme,
    ),
    ...fieldRowStyle,
    width: spec.fullWidth === true ? "100%" : undefined,
    justifyContent: "space-between",
    // The field paint is written for a native `<input>`, so it declares a text
    // cursor and selectable text. A select is button-shaped chrome: it takes a
    // pointer click, and its value must not be dragged out of it (measured,
    // plan `386`).
    userSelect: "none",
    cursor: state.disabled ? "not-allowed" : "pointer",
  });

/** The trigger's paint with a caller's contribution merged last. */
export const selectTriggerPartStyle =
  (
    spec: SelectTriggerSpec,
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
 *
 * `maxWidth` is the room on the side the list opens on: the list hugs its
 * widest option, and a 200-character label painted a 1482 px list in a 1280 px
 * window (measured, plan `368`). A left-side list is capped by the left half,
 * not by the space on its right (plan `379`). Rows and headings then truncate
 * inside it.
 */
export const selectContentStyle = (
  theme: PrimitiveTheme,
  minWidth?: number,
  maxHeight?: number,
  maxWidth?: number,
): StyleDesc => ({
  ...surfaceStyle(
    { tone: "popover", radius: "md", border: true, elevation: "overlay" },
    theme,
  ),
  padding: theme.spacing.xs,
  gap: theme.spacing["2xs"],
  // Rows stretch to the list's width so a long label truncates inside it; a
  // hugging row keeps its text's intrinsic width (measured, plan `368`).
  alignItems: "stretch",
  ...(minWidth === undefined ? {} : { minWidth }),
  ...(maxWidth === undefined ? {} : { maxWidth }),
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
    // An option is chrome: a drag across the list must not start a text
    // selection (measured, plan `386`).
    userSelect: "none",
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
  minWidth: 0,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  // A group caption is chrome, not content (plan `386`).
  userSelect: "none",
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

/**
 * The locator an option row carries: `${testId}-option-${value}`.
 *
 * The trigger and its indicator are already named (plans `083`, `343`); the
 * option rows were not, so a suite had to find the painted label and walk to
 * its parent. An absent `testId` names nothing — the wrapper never invents one.
 */
export const selectOptionTestId = (
  testId: string | undefined,
  value: string,
): string | undefined =>
  testId === undefined ? undefined : `${testId}-option-${value}`;

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
  /** The window's usable width, so a long option cannot widen the list past it. */
  readonly maxWidth?: number;
}

/** What the renderer does with the wrapper's own state. */
export interface SelectHandlers {
  readonly onOpenChange: (open: boolean) => void;
  readonly onValueChange: (value: string) => void;
  /** The trigger's host instance, so the wrapper can measure its width. */
  readonly registerTrigger: (instance: PublicInstance | null) => void;
  /** The open list's host instance, so the wrapper can measure its width. */
  readonly registerContent: (instance: PublicInstance | null) => void;
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
    fullWidth,
    label,
    style,
    triggerStyle,
    testId,
    onMouseEnter,
    onMouseLeave,
    onMouseMove,
    onMouseDown,
    onMouseUp,
    onMouseDownOutside,
    onAuxClick,
    onScroll,
    onFocus,
    onBlur,
    onKeyDown,
    onKeyUp,
    "aria-description": description,
  }: SelectProps,
  theme: PrimitiveTheme,
  state: ValueState<string>,
  open: boolean,
  focus: FocusState,
  handlers: SelectHandlers,
  placement: SelectPlacement = { collisionPadding: FLOATING_MARGIN },
): ReactElement => {
  const spec: SelectTriggerSpec = { invalid, fullWidth };
  const slot: TriggerHandlers = {
    onMouseEnter,
    onMouseLeave,
    onMouseMove,
    onMouseDown,
    onMouseUp,
    onMouseDownOutside,
    onAuxClick,
    onScroll,
    onFocus,
    onBlur,
    onKeyDown,
    onKeyUp,
  };
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
      aria-label={ariaName(choice.label)}
      aria-selected={choice.value === selected}
      disabled={choice.disabled}
      testId={selectOptionTestId(testId, choice.value)}
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
          <div style={controlLabelStyle}>{choice.label}</div>
        </>
      )}
    </SelectItem>
  );
  return (
    <GpuixSelect
      items={items}
      value={selected}
      open={open}
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
        {...passiveTriggerHandlers(slot)}
        ref={handlers.registerTrigger}
        role="combobox"
        aria-label={ariaName(label)}
        aria-description={description}
        aria-expanded={open}
        aria-valuetext={selectedLabel ?? placeholder}
        disabled={disabled}
        testId={testId === undefined ? undefined : `${testId}-trigger`}
        onFocus={composeHandler(focus.onFocus, onFocus)}
        onBlur={composeHandler(focus.onBlur, onBlur)}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        style={selectTriggerPartStyle(spec, theme, focus.focused, triggerStyle)}
      >
        <SelectValue placeholder={placeholder} style={controlLabelStyle} />
        {renderSelectIndicator(
          {
            open,
            disabled: disabled === true,
            testId: testId === undefined ? undefined : `${testId}-chevron`,
          },
          theme,
        )}
      </SelectTrigger>
      <SelectContent
        ref={handlers.registerContent}
        role="listbox"
        aria-label={ariaName(label)}
        testId={testId === undefined ? undefined : `${testId}-content`}
        side={placement.side}
        collisionPadding={placement.collisionPadding}
        style={selectContentStyle(
          theme,
          placement.minWidth,
          placement.maxHeight,
          placement.maxWidth,
        )}
      >
        {Arr.map(options, (entry, index) =>
          isSelectGroup(entry)
            ? Arr.match(entry.options, {
                // The height estimate already counts an empty group as nothing
                // (`selectRowCounts`), so painting its heading would leave a
                // section title over blank space and a list taller than the
                // number that chose its side (plan 363).
                onEmpty: () => null,
                onNonEmpty: (rows) => (
                  <SelectGroup
                    key={`${index}-${entry.label}`}
                    role="group"
                    aria-label={ariaName(entry.label)}
                    style={selectGroupStyle(theme)}
                  >
                    <SelectLabel style={selectHeadingStyle(theme)}>
                      {entry.label}
                    </SelectLabel>
                    {Arr.map(rows, row)}
                  </SelectGroup>
                ),
              })
            : row(entry),
        )}
      </SelectContent>
    </GpuixSelect>
  );
};

/** The trigger's measured box, as the side decision needs it. */
interface TriggerBox {
  readonly width: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** A list of options in a popover. */
export const Select = (props: SelectProps): ReactElement => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  const viewport = useWindowSize();
  const [triggerBox, setTriggerBox] = useState<TriggerBox | undefined>(
    undefined,
  );
  const [listWidth, setListWidth] = useState<number | undefined>(undefined);
  const trigger = useRef<number | null>(null);
  const content = useRef<number | null>(null);
  const items = useRef<Map<string, number>>(new Map());
  const focus = useFocus();
  const openState = useControlState(
    props.open,
    props.defaultOpen ?? false,
    props.onOpenChange,
  );
  // A disabled select is closed. The request also reaches a controlled parent,
  // so its state can agree with what the field paints (plan 346).
  useEffect(() => {
    if (props.disabled === true && openState.value.current)
      openState.set(false);
  }, [props.disabled, openState.value.current]);
  const open = selectOpen(openState.value.current, props.disabled === true);
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
  useLayoutEffect(() => {
    const id = trigger.current;
    if (id === null) return;
    const bounds = renderer?.getElementBounds?.(id);
    if (bounds === null || bounds === undefined || bounds.width <= 0) return;
    setTriggerBox({
      width: bounds.width,
      left: bounds.x,
      right: bounds.x + bounds.width,
      top: bounds.y,
      bottom: bounds.y + bounds.height,
    });
    const contentId = open ? content.current : null;
    const contentBounds =
      contentId === null ? undefined : renderer?.getElementBounds?.(contentId);
    setListWidth(
      contentBounds === null ||
        contentBounds === undefined ||
        contentBounds.width <= 0
        ? undefined
        : contentBounds.width,
    );
  }, [
    renderer,
    open,
    props.size,
    props.fullWidth,
    viewport.height,
    viewport.width,
  ]);
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
  const vertical = (preferred?: VerticalSide): Option.Option<VerticalSide> =>
    Option.map(request, (measurement) =>
      decideVerticalSide(
        preferred === undefined ? measurement : { ...measurement, preferred },
      ),
    );
  const horizontal = (preferred: HorizontalSide): HorizontalSide =>
    Option.getOrElse(
      Option.map(Option.fromNullishOr(triggerBox), (box) =>
        decideHorizontalSide({
          triggerLeft: box.left,
          triggerRight: box.right,
          layerWidth: listWidth ?? box.width,
          viewportWidth: viewport.width,
          margin: FLOATING_MARGIN,
          preferred,
        }),
      ),
      () => preferred,
    );
  const side = Option.match(Option.fromNullishOr(props.side), {
    onNone: () => vertical(),
    onSome: (requested) =>
      isHorizontalSide(requested)
        ? Option.some(horizontal(requested))
        : vertical(requested),
  });
  const maxHeight = Option.getOrUndefined(
    Option.flatMap(request, (measurement) =>
      Option.flatMap(side, (resolvedSide) => {
        const space = availableOn(measurement, resolvedSide);
        return measurement.layerHeight > space
          ? Option.some(Math.max(space, 0))
          : Option.none();
      }),
    ),
  );
  return renderSelect(
    props,
    theme,
    state.value,
    open,
    focus,
    {
      onOpenChange: openState.set,
      onValueChange: state.set,
      registerTrigger: (instance) => {
        trigger.current = instance?.id ?? null;
      },
      registerContent: (instance) => {
        content.current = instance?.id ?? null;
      },
      registerItem: (value) => (instance) => {
        if (instance === null) items.current.delete(value);
        else items.current.set(value, instance.id);
      },
      onHighlight: scrollToOption,
    },
    {
      minWidth: triggerBox?.width,
      side: Option.getOrUndefined(side),
      collisionPadding: FLOATING_MARGIN,
      maxHeight,
      maxWidth:
        triggerBox === undefined
          ? viewport.width - 2 * FLOATING_MARGIN
          : Math.max(
              0,
              availableWidth(
                {
                  triggerLeft: triggerBox.left,
                  triggerRight: triggerBox.right,
                  viewportWidth: viewport.width,
                  margin: FLOATING_MARGIN,
                },
                Option.getOrElse(side, () => "bottom"),
              ),
            ),
    },
  );
};
