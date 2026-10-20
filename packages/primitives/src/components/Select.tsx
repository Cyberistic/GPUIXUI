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
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { useGpuix, useWindowSize } from "@gpuix/react";
import type { EventPayload, PublicInstance, StyleDesc } from "@gpuix/react";
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
  selectHasChoices,
  selectOpen,
  selectOptions,
  selectRowCounts,
  selectValueText,
  type SelectEntry,
  type SelectOption,
  type SelectOptionGroup,
} from "../core/select.js";
import { controlLabelStyle, surfaceStyle } from "../core/style.js";
import {
  paintedBox,
  scrollIntoViewDelta,
  viewportBox,
} from "../core/bounds.js";
import { fieldRecipeStyle, fieldRowStyle } from "../core/recipes.js";
import { hasText } from "../core/text.js";
import { typeaheadChar } from "../core/typeahead.js";
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
  composeRef,
  optionText,
  passiveTriggerHandlers,
  resolvePartStyle,
  useControlState,
  useFloatingFollow,
  useFocus,
  type FocusState,
  type StateStyle,
  type TriggerHandlers,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";
import { useTypeahead } from "./typeahead.js";

export type { SelectEntry, SelectOption, SelectOptionGroup };

/** The public state a `Select` trigger's style callback receives. */
export interface SelectTriggerState extends GpuixSelectTriggerState {
  /** Whether the visible trigger itself holds native focus. */
  readonly focused: boolean;
  /**
   * Visible and focusable, but the list never opens and the value never
   * changes. Distinct from `disabled`, which leaves the tab order and fades
   * the field (plan `797`).
   */
  readonly readOnly: boolean;
}

/** The public state a `Select` style callback receives. */
export interface SelectState {
  readonly open: boolean;
  readonly disabled: boolean;
  readonly invalid: boolean;
  /** The display state: focusable and unchanged, but no list (plan `797`). */
  readonly readOnly: boolean;
}

export interface SelectProps extends TriggerHandlers {
  /**
   * Choices in paint order. A group paints a heading and its options; the
   * heading is not selectable, and option values stay unique across groups.
   */
  readonly options: ReadonlyArray<SelectEntry>;
  /**
   * Controlled selection. Omit to let the select hold its own.
   *
   * `""` is an ordinary value: `value=""` selects an option valued `""`
   * ("Any"/"All"/"None"), not "no selection" (plan 501).
   */
  readonly value?: string;
  /**
   * Initial selection when uncontrolled. Omit — together with `value` — for no
   * selection, which paints the `placeholder`.
   */
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
  /**
   * Visible and focusable, but the list never opens and the value never
   * changes. The chevron is hidden and the cursor is `default`; `disabled`
   * also leaves the tab order and fades the field (plan `797`).
   */
  readonly readOnly?: boolean;
  /** Validation failed: the trigger's border takes the destructive role. */
  readonly invalid?: boolean;
  /**
   * Take keyboard focus on mount, and ring while it holds that focus.
   *
   * A field mounted after a loading state still focuses — the trigger asks the
   * renderer through the host's own `autoFocus`, which a focusable `div` honours
   * on a later mount too (probed for plan `806`; the same contract as
   * `Input`/`TextArea`/`NumberField`/`OTPField`, plan `584`). The ring follows
   * the native-focus tracker, so it paints in the first frame of the window's
   * first render and at most one 50 ms sample late on a later mount (plan `583`);
   * a select that is not focused never rings. A `readOnly` select focuses the
   * same way, because it keeps its tab stop and ring (plan `797`); a `disabled`
   * one never does, and is out of the tab order either way.
   */
  readonly autoFocus?: boolean;
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
  /**
   * A read-only field has no list to promise, so it paints no chevron
   * (plan `797`).
   */
  readonly readOnly?: boolean;
  readonly testId?: string;
}

/**
 * The chevron that says "this field opens a list".
 *
 * Decoration, not content: no `label`, so it stays out of the accessibility
 * tree and cannot rename the combobox. The icon sets `pointerEvents: "none"`,
 * so a click inside it still reaches the trigger. A read-only select paints
 * none, because the list cannot open (plan `797`).
 */
export const renderSelectIndicator = (
  { open, disabled, readOnly, testId }: SelectIndicatorProps,
  theme: PrimitiveTheme,
): ReactElement | null =>
  readOnly === true ? null : (
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
  readonly readOnly?: boolean;
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
    cursor: state.disabled
      ? "not-allowed"
      : spec.readOnly === true
        ? "default"
        : "pointer",
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
    const resolved: SelectTriggerState = {
      ...state,
      focused,
      readOnly: spec.readOnly === true,
    };
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
 * The list's padding on the side that faces its trigger.
 *
 * The runtime anchors a layer's **content** box to the trigger, so the surface's
 * padding is laid back toward the trigger: a list opening above overlapped its
 * field by the padding, and one below ran that far past the window margin. The
 * side decision and the cap reserve it, so the painted surface touches the
 * trigger without covering it (measured, plan `597`).
 */
export const selectListOverhang = (theme: PrimitiveTheme): number =>
  theme.spacing.xs;

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
 * Reports a newly highlighted option; renders nothing.
 *
 * Mounted only while its item is highlighted, so the effect fires once per
 * highlight change and not on unrelated re-renders. The wrapper measures the
 * row and the list and moves the list itself (plan `599`).
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

/**
 * The element tree `Select` renders. Pure in its arguments.
 *
 * `state` is the runtime's controlled `value` boundary: `undefined` is the
 * absence and `""` is an ordinary option value ("Any"/"All"/"None"), so it must
 * not double as a sentinel (plan 501).
 */
export const renderSelect = (
  {
    options,
    placeholder,
    disabled,
    readOnly,
    invalid,
    fullWidth,
    autoFocus,
    label,
    style,
    triggerStyle,
    testId,
    ref,
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
  state: ValueState<string | undefined>,
  open: boolean,
  focus: FocusState,
  handlers: SelectHandlers,
  placement: SelectPlacement = { collisionPadding: FLOATING_MARGIN },
): ReactElement => {
  const spec: SelectTriggerSpec = { invalid, fullWidth, readOnly };
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
  const selected = state.current;
  const selectedLabel = Option.getOrElse(
    Option.flatMap(Option.fromNullishOr(selected), (value) =>
      Option.map(
        Arr.findFirst(flat, (option) => option.value === value),
        (option) => optionText(option.label, option.value),
      ),
    ),
    () => undefined,
  );
  const items = Arr.map(flat, (option) => {
    const text = optionText(option.label, option.value);
    return {
      value: option.value,
      label: text,
      textValue: text,
      disabled: option.disabled === true,
    };
  });
  const row = (choice: SelectOption): ReactElement => {
    const text = optionText(choice.label, choice.value);
    return (
      <SelectItem
        key={choice.value}
        ref={handlers.registerItem(choice.value)}
        value={choice.value}
        role="option"
        aria-label={ariaName(text)}
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
            <div style={controlLabelStyle}>{text}</div>
          </>
        )}
      </SelectItem>
    );
  };
  return (
    <GpuixSelect
      items={items}
      value={selected}
      open={open}
      onValueChange={handlers.onValueChange}
      onOpenChange={handlers.onOpenChange}
      /* Read-only must also stop the runtime's item/arrow paths, not just the
         wrapper's open state: a future layer leak would otherwise commit a
         value. The trigger overrides its own `disabled` below so it keeps the
         tab stop (plan 797). */
      disabled={disabled === true || readOnly === true}
      testId={testId}
      style={resolvePartStyle(
        { width: fullWidth === true ? "100%" : undefined },
        style,
        {
          open,
          disabled: disabled === true,
          invalid: invalid === true,
          readOnly: readOnly === true,
        },
      )}
    >
      <SelectTrigger
        {...passiveTriggerHandlers(slot)}
        ref={composeRef(ref, handlers.registerTrigger)}
        role="combobox"
        aria-label={ariaName(label)}
        aria-description={ariaName(description)}
        aria-expanded={open}
        aria-valuetext={selectValueText(selectedLabel, placeholder)}
        /* Explicit, not `undefined`: GPUix resolves `disabledProp ??
           context.disabled`, so a read-only root's disabled context would
           otherwise remove the tab stop (plan 797). */
        disabled={disabled === true}
        autoFocus={disabled === true ? undefined : autoFocus}
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
            readOnly: readOnly === true,
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
        sideOffset={
          placement.side === "top" || placement.side === "left"
            ? selectListOverhang(theme)
            : undefined
        }
        alignOffset={
          placement.side === "left" || placement.side === "right"
            ? -selectListOverhang(theme)
            : undefined
        }
        collisionPadding={placement.collisionPadding}
        style={selectContentStyle(
          theme,
          placement.minWidth,
          placement.maxHeight,
          placement.maxWidth,
        )}
      >
        {Arr.flatMap(options, (entry, index) =>
          isSelectGroup(entry)
            ? Arr.match(entry.options, {
                // The height estimate already counts an empty group as nothing
                // (`selectRowCounts`), so painting its heading would leave a
                // section title over blank space and a list taller than the
                // number that chose its side (plan 363).
                onEmpty: () => [],
                // A heading with no text is not a heading: it would paint an
                // empty caption row and expose an unnamed `group` node, while
                // the estimate counts it as flat options (plan 579).
                onNonEmpty: (rows) =>
                  hasText(entry.label)
                    ? [
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
                        </SelectGroup>,
                      ]
                    : Arr.map(rows, row),
              })
            : [row(entry)],
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

/** Whether a follow tick found the same box, so the state can stay put. */
const sameTriggerBox = (a: TriggerBox, b: TriggerBox): boolean =>
  a.width === b.width &&
  a.left === b.left &&
  a.right === b.right &&
  a.top === b.top &&
  a.bottom === b.bottom;

/** A list of options in a popover. */
export const Select = (props: SelectProps): ReactElement => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  const [triggerBox, setTriggerBox] = useState<TriggerBox | undefined>(
    undefined,
  );
  const [listWidth, setListWidth] = useState<number | undefined>(undefined);
  const trigger = useRef<number | null>(null);
  const content = useRef<number | null>(null);
  const items = useRef<Map<string, number>>(new Map());
  const focus = useFocus(false, () => trigger.current ?? undefined);
  const openState = useControlState(
    props.open,
    props.defaultOpen ?? false,
    props.onOpenChange,
  );
  // A disabled select is closed, and so is one with nothing to list: the
  // runtime refuses every choice on a disabled control, and a listbox with no
  // rows offers nothing either (plans 346, 745). The request also reaches a
  // controlled parent, so its state can agree with what the field paints.
  const hasChoices = selectHasChoices(props.options);
  useEffect(() => {
    if (
      (props.disabled === true || props.readOnly === true || !hasChoices) &&
      openState.value.current
    )
      openState.set(false);
  }, [props.disabled, props.readOnly, hasChoices, openState.value.current]);
  const open =
    selectOpen(
      openState.value.current,
      props.disabled === true,
      props.readOnly === true,
    ) && hasChoices;
  /**
   * The host window, sampled only while the list is painted.
   *
   * A closed select has no placement to correct, and the observer reads the
   * current size when it subscribes, so opening after a resize is still exact
   * (plan `609`; the `Tooltip` rule from plan `604`).
   */
  const viewport = useWindowSize({ intervalMs: open ? 100 : false });
  /**
   * The list's own chrome, for the box correction and the estimate.
   *
   * The runtime reports a plain `div` from its content origin, so a raw width
   * is short by both borders and a raw top sits inside the list's padding
   * (plan `597`).
   */
  const contentChrome = useMemo(() => selectContentStyle(theme), [theme]);
  /**
   * The trigger's chrome, for the same correction. The runtime state only
   * changes colour and ring, so a neutral state yields the real insets.
   */
  const triggerChrome = useMemo(
    () =>
      selectTriggerPartStyle(
        {
          invalid: props.invalid === true,
          fullWidth: props.fullWidth === true,
          readOnly: props.readOnly === true,
        },
        theme,
        false,
        props.triggerStyle,
      )({
        open: false,
        disabled: props.disabled === true,
        placeholder: true,
      }),
    [
      theme,
      props.invalid,
      props.fullWidth,
      props.disabled,
      props.readOnly,
      props.triggerStyle,
    ],
  );
  const state = useControlState<string | undefined>(
    props.value,
    props.defaultValue,
    (next) => {
      // The runtime reports a string (an option's value). A future "clear" path
      // would be a separate interaction, not an invented `""` report.
      if (next !== undefined) props.onValueChange?.(next);
    },
  );
  /**
   * Type-ahead over the closed trigger.
   *
   * A focused select answers a typed prefix by choosing the next enabled option
   * whose text starts with it, the way a desktop select does; without it a long
   * list is arrow-only. The rule is `core/typeahead.ts` (500 ms window, repeated
   * letter advances, disabled rows skipped). Only the **closed** trigger types:
   * while the list is open GPUix owns the highlight and exposes no way to move
   * it, so a second cursor here would disagree with the painted one (plan `731`).
   */
  const flat = useMemo(() => selectOptions(props.options), [props.options]);
  const typeItems = useMemo(
    () =>
      Arr.map(flat, (option) => ({
        value: option.value,
        label: optionText(option.label, option.value),
        disabled: option.disabled === true,
      })),
    [flat],
  );
  const selectedIndex = Option.flatMap(
    Option.fromNullishOr(state.value.current),
    (value) => Arr.findFirstIndex(flat, (option) => option.value === value),
  );
  const typeahead = useTypeahead(typeItems, selectedIndex, (match) =>
    state.set(match.item.value),
  );
  const onTypeaheadKey = (event: EventPayload): void => {
    // The caller sees every key first; the runtime has no `defaultPrevented`,
    // so a caller cannot cancel the type-ahead (documented). A read-only
    // field never types: it may not change its value (plan 797).
    props.onKeyDown?.(event);
    if (open || props.disabled === true || props.readOnly === true) return;
    Option.match(typeaheadChar(event), {
      onNone: () => {},
      onSome: typeahead,
    });
  };
  /**
   * Moves the list so the highlighted row is inside it.
   *
   * The renderer's own `scrollIntoView` scrolls to the child **before** the
   * target: measured, `scrollIntoView(row 26)` left row 26's top at the list's
   * bottom edge and row 25 flush with it, so the keyboard highlight was never
   * visible while arrowing down (plan `599`). Both painted boxes are measured
   * instead and the list moves by the row's overflow, which the renderer clamps
   * to the content (plan `337`). Keyed by the option's value, not its position:
   * a heading between options makes the two differ.
   */
  const scrollToOption = useCallback(
    (value: string) => {
      const listId = content.current;
      const rowId = items.current.get(value);
      if (listId === null || rowId === undefined || renderer === null) return;
      const offset = renderer.getScrollOffset?.(listId);
      const listBox = renderer.getElementBounds?.(listId);
      const rowBox = renderer.getElementBounds?.(rowId);
      if (
        offset === null ||
        offset === undefined ||
        listBox === null ||
        listBox === undefined ||
        rowBox === null ||
        rowBox === undefined
      )
        return;
      const [offsetX, offsetY] = offset;
      if (offsetX === undefined || offsetY === undefined) return;
      // Only the content surface's insets matter here; its width/height caps do
      // not. The page and the resolver stay one source because this is the same
      // style the list paints with.
      const visible = viewportBox(
        paintedBox(listBox, selectContentStyle(theme)),
        { x: offsetX, y: offsetY },
      );
      // A row has no vertical padding or border (`selectItemStyle`), so its
      // report is already its painted box on that axis.
      const delta = scrollIntoViewDelta(rowBox, visible);
      if (delta !== 0) renderer.scrollTo?.(listId, offsetX, offsetY - delta);
    },
    [renderer, theme],
  );
  const measure = useCallback(() => {
    const id = trigger.current;
    if (id === null) return;
    const bounds = renderer?.getElementBounds?.(id);
    if (bounds === null || bounds === undefined || bounds.width <= 0) return;
    const painted = paintedBox(bounds, triggerChrome);
    const nextBox: TriggerBox = {
      width: painted.width,
      left: painted.x,
      right: painted.x + painted.width,
      top: painted.y,
      bottom: painted.y + painted.height,
    };
    // A follow tick must not re-render an unchanged trigger (plan `645`).
    setTriggerBox((current) =>
      current !== undefined && sameTriggerBox(current, nextBox)
        ? current
        : nextBox,
    );
    const contentId = open ? content.current : null;
    const contentBounds =
      contentId === null ? undefined : renderer?.getElementBounds?.(contentId);
    const nextWidth =
      contentBounds === null ||
      contentBounds === undefined ||
      contentBounds.width <= 0
        ? undefined
        : paintedBox(contentBounds, contentChrome).width;
    setListWidth((current) => (current === nextWidth ? current : nextWidth));
  }, [renderer, open, triggerChrome, contentChrome]);
  useLayoutEffect(() => {
    measure();
  }, [measure, viewport.height, viewport.width]);
  // The window observer above covers a resize; this follows the trigger itself
  // across a layout change, which 0.10.0 cannot report (plans `604`, `645`).
  useFloatingFollow(open, measure);
  const counts = selectRowCounts(props.options);
  const request = Option.map(
    Option.fromNullishOr(triggerBox),
    (box): PlacementRequest => ({
      triggerTop: box.top,
      triggerBottom: box.bottom,
      // `selectListHeight` already includes the surface's padding, gaps and
      // both borders; the extra overhang is the padding that falls back toward
      // the trigger (plan `597`).
      layerHeight:
        selectListHeight(counts.options, theme, counts.headings) +
        selectListOverhang(theme),
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
        const space =
          availableOn(measurement, resolvedSide) - selectListOverhang(theme);
        return measurement.layerHeight > space
          ? Option.some(Math.max(space, 0))
          : Option.none();
      }),
    ),
  );
  return renderSelect(
    { ...props, onKeyDown: onTypeaheadKey },
    theme,
    state.value,
    open,
    focus,
    {
      /* A read-only field refuses an open request outright; a controlled
         parent is only ever asked to close, never to open (plan 797). */
      onOpenChange: (next) => {
        if (next && props.readOnly === true) return;
        openState.set(next);
      },
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
              ) - selectListOverhang(theme),
            ),
    },
  );
};
