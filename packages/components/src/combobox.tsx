/**
 * Combobox: a searchable single- or multi-select built on GPUix's headless
 * combobox, with our own ranking from `combobox/logic.ts`.
 *
 * GPUix's `items` are strings and its `filter` is a predicate that preserves the
 * original order, so a predicate cannot express our ranking. The adapter therefore
 * feeds it an already-ranked `items` array (`filter={null}`) and controls
 * `inputValue`, which is the documented fallback plan 116 §3 allowed. Values are
 * the option `value`, never the displayed label. `ComboboxOption.group` turns
 * consecutive rows into a labelled section, ranked within the section so its
 * heading never repeats (plan 395).
 *
 * The popup is a dismiss layer like every other overlay here (plan 398): GPUix's
 * headless handlers close it but cannot claim the event, so without our layer one
 * Escape or backdrop press closed the popup **and** an enclosing dialog. A press
 * on our own trigger is claimed but does not close: the click that follows in a
 * later task closes the popup (plan 583), and the headless close it also triggers
 * is ignored once.
 *
 * Focus, the active row and Enter/arrow handling stay GPUix's: those are proven
 * in its own suite and reimplementing them here would be a second, worse copy.
 * The parts own the trigger label, the ranking adapter and the selection payload,
 * and a part is never given a duplicated `value` prop.
 *
 * `onCreate` appends one synthetic trailing item over the typed query, so the
 * create path reuses the runtime's highlight and Enter semantics. The synthetic
 * value never reaches `onValueChange`; see `combobox/logic.ts`.
 */

import {
  Combobox as HeadlessCombobox,
  ComboboxContent as HeadlessContent,
  ComboboxEmpty as HeadlessEmpty,
  ComboboxGroup as HeadlessGroup,
  ComboboxInput as HeadlessInput,
  ComboboxItem as HeadlessItem,
  ComboboxLabel as HeadlessLabel,
  ComboboxList as HeadlessList,
  ComboboxTrigger as HeadlessTrigger,
  type ComboboxItemState,
  type ComboboxListProps as HeadlessListProps,
  type ComboboxTriggerProps as HeadlessTriggerProps,
  type ComboboxValue,
  type EventPayload,
} from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance, StyleDesc } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type FloatingContentProps,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import {
  canCreate,
  createValue,
  groupOfOption,
  labelOf,
  parseCreateValue,
  rowRuns,
  visibleOptions,
  type ComboboxOption,
} from "./combobox/logic.js";
import { useControllableState } from "./internal/controllable.js";
import { dismissTopLayer, pushDismissLayer } from "./internal/dismiss-layer.js";
import { isDismiss } from "./internal/key.js";
import { controlName } from "./internal/name.js";
import { useNativeFocusId } from "./internal/native-focus.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { pressedOn } from "./internal/pointer.js";
import { useMergedRef } from "./internal/ref.js";
import { scrollRowIntoView } from "./internal/scroll.js";
import { stateDescription } from "./internal/state-description.js";
import {
  controlHeight,
  elevationShadow,
  focusRing,
  textStyle,
  useTheme,
  type Theme,
} from "./internal/theme.js";
import { usePlacement } from "./internal/use-placement.js";

/** What a selection callback receives: one value, several, or none. */
export type ComboboxSelection = string | null | ReadonlyArray<string>;

/** The rules a combobox part follows; throws outside a {@link Combobox}. */
interface ComboboxContextValue {
  readonly options: ReadonlyArray<ComboboxOption>;
  /** The values fed to the runtime, ranked; includes the create row. */
  readonly rows: ReadonlyArray<string>;
  readonly selectedValues: ReadonlyArray<string>;
  readonly open: boolean;
  readonly disabled: boolean;
  /** Whether the caller is fetching the rows the empty slot would stand in for. */
  readonly loading: boolean;
  readonly labelFor: (value: string) => string;
  readonly isDisabled: (value: string) => boolean;
  /** The heading a row sits under; ungrouped rows and the create row are none. */
  readonly groupOf: (value: string) => Option.Option<string>;
  /** Report a user edit to `onQueryChange`; never called for a selection. */
  readonly noteQueryChange: (query: string) => void;
  readonly trigger: RefObject<PublicInstance | null>;
  readonly registerTrigger: (instance: PublicInstance | null) => void;
  /** The scrolling listbox, the viewport a highlighted row is revealed in. */
  readonly registerList: (instance: PublicInstance | null) => void;
  /** Scroll a highlighted row into the list's viewport. */
  readonly revealRow: (row: PublicInstance) => void;
  /** An Escape press: close and return focus to the trigger. */
  readonly noteEscape: () => void;
  /** An outside press: it already moved focus, and it may have been the trigger. */
  readonly noteOutsidePress: (event: EventPayload) => void;
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
  /** The controlled popup state. `undefined` means uncontrolled. */
  readonly open?: boolean;
  /** The uncontrolled starting state. Default `false`. */
  readonly defaultOpen?: boolean;
  /** Called with every popup open or close request, in both modes. */
  readonly onOpenChange?: (open: boolean) => void;
  /** Default `false`: one value and the popup closes on select. */
  readonly multiple?: boolean;
  readonly disabled?: boolean;
  /**
   * Called with the search text: `""` when the popup opens, then once per user
   * edit. A selection's label write is never reported, so an async caller can
   * fetch on every call without fetching its own answer.
   */
  readonly onQueryChange?: (query: string) => void;
  /**
   * Milliseconds to wait after the last edit before reporting it, so a remote
   * source is asked once for `"cal"` instead of once per keystroke. Default `0`
   * reports every edit. Opening reports `""` immediately and a close drops a
   * pending report, so a request is never made for text the user abandoned.
   */
  readonly debounce?: number;
  /**
   * Default `true`. `false` shows `options` exactly as given (membership and
   * order), for a caller that filters remotely.
   */
  readonly shouldFilter?: boolean;
  /** While nothing is shown, the default empty slot says `Loading…`. */
  readonly loading?: boolean;
  /**
   * Offer a trailing "create" row when the trimmed query names no option. The
   * callback receives the trimmed query after the row is selected.
   */
  readonly onCreate?: (query: string) => void;
  /** The create row's text. Default `Create “<query>”`. */
  readonly createLabel?: (query: string) => string;
  readonly children?: PartChildren;
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

/** The create row's default text. */
const defaultCreateLabel = (query: string): string => `Create “${query}”`;

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
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  multiple = false,
  disabled = false,
  onQueryChange,
  debounce: debounceProp = 0,
  shouldFilter = true,
  loading = false,
  onCreate,
  createLabel = defaultCreateLabel,
  children,
}: ComboboxProps) => {
  const renderer = useGpuix().renderer;
  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const [query, setQuery] = useState("");
  const trigger = useRef<PublicInstance | null>(null);
  const list = useRef<PublicInstance | null>(null);
  const restoreFocus = useRef(false);
  const wasOpen = useRef(false);
  /** Whether the outside press that is closing the popup landed on our trigger. */
  const dismissedOnTrigger = useRef(false);
  const close = useRef<() => void>(() => undefined);

  // `onQueryChange` is reported through a debounce when the caller asks for one
  // (plan 541). The callback is read from a ref so a pending timer never calls a
  // stale closure, and a close or unmount drops the pending report.
  const debounce = Number.isFinite(debounceProp)
    ? Math.max(0, Math.trunc(debounceProp))
    : 0;
  const queryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onQueryChangeRef = useRef(onQueryChange);
  useLayoutEffect(() => {
    onQueryChangeRef.current = onQueryChange;
  });
  const cancelPendingQuery = useCallback(() => {
    if (queryTimer.current === null) return;
    clearTimeout(queryTimer.current);
    queryTimer.current = null;
  }, []);
  const reportQuery = useCallback(
    (next: string, immediate: boolean) => {
      cancelPendingQuery();
      if (immediate || debounce === 0) {
        onQueryChangeRef.current?.(next);
        return;
      }
      queryTimer.current = setTimeout(() => {
        queryTimer.current = null;
        onQueryChangeRef.current?.(next);
      }, debounce);
    },
    [cancelPendingQuery, debounce],
  );
  useLayoutEffect(() => cancelPendingQuery, [cancelPendingQuery]);

  // "Opening reports an empty query" is a transition rule, so it also holds for
  // a popup mounted with `defaultOpen`; a user open still reports exactly once.
  const reportedOpen = useRef(false);
  useLayoutEffect(() => {
    if (open && !reportedOpen.current) reportQuery("", true);
    reportedOpen.current = open;
  }, [open, reportQuery]);

  // The list is the scroll viewport. `scrollIntoView` would scroll to its group
  // wrapper, so the row and the list are measured and the list is scrolled to a
  // computed offset (plan 535).
  const revealRow = useCallback(
    (row: PublicInstance) => {
      const listId = list.current?.id;
      if (listId === undefined) return;
      scrollRowIntoView(
        {
          row: renderer?.getElementBounds?.(row.id),
          viewport: renderer?.getElementBounds?.(listId),
          offsetY: renderer?.getScrollOffset?.(listId)?.[1],
        },
        (offsetY) => renderer?.scrollTo?.(listId, 0, offsetY),
      );
    },
    [renderer],
  );

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

  const visible = visibleOptions(options, query, shouldFilter);
  const creatable =
    onCreate !== undefined && canCreate(options, Str.trim(query));
  const create = creatable
    ? Option.some(createValue(Str.trim(query)))
    : Option.none();
  const items = Option.match(create, {
    onNone: () => Arr.map(visible, (option) => option.value),
    onSome: (value) =>
      Arr.append(
        Arr.map(visible, (option) => option.value),
        value,
      ),
  });

  assertParts(comboboxRoot, children);

  const labelFor = (value: string): string =>
    Option.match(parseCreateValue(value), {
      onSome: createLabel,
      onNone: () =>
        Option.match(optionOf(options, value), {
          onNone: () => value,
          onSome: labelOf,
        }),
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

  // The close path is read by the dismiss layer, which must not re-push on every
  // render: a re-push would put this popup above a surface opened after it.
  useLayoutEffect(() => {
    close.current = () => {
      cancelPendingQuery();
      setOpen(false);
      setQuery("");
    };
  });

  // The popup is a dismiss layer, like every other overlay here. GPUix closes it
  // on Escape and outside presses but cannot claim the event, so without this an
  // enclosing dialog closed on the same Escape (plan 398). A press on our own
  // trigger is claimed without closing: the click that follows in a later task
  // closes the popup (plan 583).
  useLayoutEffect(() => {
    if (!open) return;
    return pushDismissLayer((event) => {
      if (dismissedOnTrigger.current) return;
      close.current();
      if (event.eventType === "keyDown") restoreFocus.current = true;
    });
  }, [open]);

  return (
    <ComboboxContext.Provider
      value={{
        options,
        rows: items,
        selectedValues,
        open,
        disabled,
        loading,
        labelFor,
        groupOf: (value) =>
          Option.flatMap(optionOf(options, value), groupOfOption),
        isDisabled: (value) =>
          Option.exists(
            optionOf(options, value),
            (option) => option.disabled === true,
          ),
        noteQueryChange: (next) => reportQuery(next, false),
        trigger,
        registerTrigger: (instance) => {
          trigger.current = instance;
        },
        registerList: (instance) => {
          list.current = instance;
        },
        revealRow,
        noteEscape: () => {
          restoreFocus.current = true;
        },
        noteOutsidePress: (event) => {
          restoreFocus.current = false;
          dismissedOnTrigger.current = pressedOn(
            renderer,
            trigger.current,
            event,
          );
        },
      }}
    >
      <HeadlessCombobox
        items={items}
        value={selected}
        onValueChange={(next) => {
          const nextValues: ReadonlyArray<string> =
            typeof next === "string" ? [next] : (next ?? []);
          const created = Option.flatMap(
            Arr.findFirst(nextValues, (value) =>
              Option.isSome(parseCreateValue(value)),
            ),
            parseCreateValue,
          );
          if (Option.isSome(created)) {
            onCreate?.(created.value);
            if (multiple) {
              const kept = Arr.filter(selectedValues, (value) =>
                Option.isNone(parseCreateValue(value)),
              );
              setSelected(
                Arr.contains(kept, created.value)
                  ? kept
                  : Arr.append(kept, created.value),
              );
              setQuery("");
              return;
            }
            restoreFocus.current = true;
            setSelected(created.value);
            return;
          }
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
          // The headless content closes itself on the same outside press our
          // layer just claimed. When the press was our trigger, the click that
          // follows closes the popup; closing here would let that click re-open
          // it (plan 583).
          if (dismissedOnTrigger.current) {
            dismissedOnTrigger.current = false;
            return;
          }
          close.current();
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

/**
 * The closed control: the selected labels, the caret and `aria-expanded`. It
 * paints the token focus ring while it holds focus, and gives it up while the
 * popup is open because the search field owns focus then. A caller `style`
 * merges last (plan 565).
 */
export const ComboboxTrigger = ({
  placeholder = "Select…",
  label,
  testId = "combobox-trigger",
  autoFocus = false,
  onFocus,
  onBlur,
  onKeyDown,
  style,
  ref,
  ...rest
}: ComboboxTriggerProps) => {
  const theme = useTheme();
  const { selectedValues, open, disabled, labelFor, registerTrigger, trigger } =
    useCombobox();
  const setTrigger = useMergedRef<PublicInstance | null>(registerTrigger, ref);
  // The runtime delivers no React `focus`/`blur` for a native focus change
  // (plans 536/540), so the ring follows the host the renderer reports —
  // whether the trigger was tabbed onto, pressed, or given focus back by an
  // accepted close (plan 672). Until it reports a host, the `autoFocus` seed
  // stands, because that focus is applied after React's effects (plan 388).
  const focusedId = useNativeFocusId(!disabled);
  const focused =
    focusedId === null
      ? autoFocus && !disabled
      : focusedId === (trigger.current?.id ?? null);
  const display =
    selectedValues.length === 0
      ? placeholder
      : Arr.join(
          Arr.map(selectedValues, (value) => labelFor(value)),
          ", ",
        );
  // 0.10.0 does not lift the trigger's text child into its name (plan 391), and
  // `label` is optional — fall back to the visible text, exactly as a browser
  // names `<button>Select…</button>` (plan 666).
  const name = controlName(rest["aria-label"] ?? label, display);

  return (
    <HeadlessTrigger
      role="button"
      aria-expanded={open}
      ref={setTrigger}
      testId={testId}
      disabled={disabled}
      autoFocus={autoFocus && !disabled}
      {...rest}
      {...(name === undefined ? {} : { "aria-label": name })}
      {...stateDescription(disabled, rest["aria-description"])}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        // Escape closes the open popup as one surface, like the search field.
        if (isDismiss(event)) dismissTopLayer(event);
      }}
      style={mergeStyles(
        {
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
          ...(focused && !disabled && !open ? focusRing(theme) : {}),
        },
        style,
      )}
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
      <Icon
        name="chevron-down"
        color={theme.colors.mutedForeground}
        size="sm"
      />
    </HeadlessTrigger>
  );
};

/** {@link ComboboxContent} props: the anchored popup surface. */
export interface ComboboxContentProps extends FloatingContentProps {
  /** Default `"bottom"`. Flipped once if the snapped surface would cover the trigger. */
  readonly side?: "top" | "right" | "bottom" | "left";
  /** Default `"start"`. `"center"` is measured from the trigger, not the runtime's `center`. */
  readonly align?: "start" | "center" | "end";
  /** The gap between trigger and surface. Default `4`. */
  readonly sideOffset?: number;
  /** Added on top of the measured centre correction. Default `0`. */
  readonly alignOffset?: number;
  readonly children?: PartChildren;
}

/** The popup. It renders while the combobox is open, anchored by GPUix. */
export const ComboboxContent = ({
  side = "bottom",
  align = "start",
  sideOffset = 4,
  alignOffset = 0,
  collisionPadding = 8,
  children,
  onMouseDownOutside,
  style,
  ref,
  ...rest
}: ComboboxContentProps) => {
  const theme = useTheme();
  const { noteOutsidePress, open, trigger } = useCombobox();
  const surface = useRef<PublicInstance | null>(null);
  const setSurface = useMergedRef<PublicInstance | null>(surface, ref);
  const placement = usePlacement({
    open,
    side,
    align,
    margin: collisionPadding,
    trigger,
    surface,
  });
  assertParts(comboboxContent, children);

  return (
    <HeadlessContent
      testId="combobox-content"
      side={placement.side}
      align={placement.align}
      sideOffset={sideOffset}
      alignOffset={placement.alignOffset + alignOffset}
      collisionPadding={collisionPadding}
      ref={setSurface}
      {...rest}
      onMouseDownOutside={(event) => {
        noteOutsidePress(event);
        dismissTopLayer(event);
        onMouseDownOutside?.(event);
      }}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing["2xs"],
          minWidth: 220,
          maxHeight: 280,
          overflow: "hidden",
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
  /** The host input's own change event, composed after `onQueryChange`. */
  readonly onChange?: (event: EventPayload) => void;
}

/** The search field. Escape asks the root to return focus to the trigger. */
export const ComboboxInput = ({
  placeholder = "Search…",
  label = "Search options",
  onChange,
}: ComboboxInputProps) => {
  const theme = useTheme();
  const { noteEscape, noteQueryChange, open } = useCombobox();
  // The field mounts with the popup and the root focuses it natively after
  // React's effects, so `onFocus` does not run on open (plans 388, 523).
  const [focused, setFocused] = useState(open);

  return (
    <HeadlessInput
      testId="combobox-input"
      placeholder={placeholder}
      aria-label={label}
      onChange={(event) => {
        // The host edit is the only signal that means "the user typed": the
        // runtime also writes the selected label into the field on commit.
        noteQueryChange(event.value ?? "");
        onChange?.(event);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={(event) => {
        // Offer Escape to the stack from the focused surface itself: GPUix's
        // handler closes this popup but cannot claim the event, and the runtime
        // flushes React's update before an enclosing surface sees the key, so
        // the layer would already be gone by then (plan 398).
        if (isDismiss(event)) {
          noteEscape();
          dismissTopLayer(event);
        }
      }}
      style={{
        ...textStyle(theme, "body"),
        height: controlHeight(theme, "sm"),
        flexShrink: 0,
        paddingLeft: theme.spacing.md,
        paddingRight: theme.spacing.md,
        backgroundColor: theme.colors.input,
        color: theme.colors.inputForeground,
        borderRadius: theme.radius.sm,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
        ...(focused ? focusRing(theme) : {}),
      }}
    />
  );
};

/** {@link ComboboxList} props. */
export interface ComboboxListProps extends Omit<HeadlessListProps, "children"> {
  /** The listbox's accessible name. Default `"Options"`. */
  readonly label?: string;
  /** Default `"combobox-list"`. */
  readonly testId?: string;
  /** A style for every option row, or a function of its state. */
  readonly itemStyle?: StateStyle<ComboboxItemState>;
}

/**
 * The listbox: one labelled group per contiguous run of options sharing a
 * `group`, and one {@link ComboboxItem} per visible option inside it. Rendering
 * the rows as nodes (rather than through the headless render prop) is what lets
 * a heading sit between runs; item registration and highlight still come from
 * the root context.
 *
 * It is the popup's scroll viewport, so the search field above it stays fixed
 * while a highlighted row is revealed (plan 535).
 */
export const ComboboxList = ({
  label = "Options",
  testId = "combobox-list",
  itemStyle,
  style,
  ref,
  ...rest
}: ComboboxListProps) => {
  const theme = useTheme();
  const { rows, groupOf, registerList } = useCombobox();
  const setList = useMergedRef<PublicInstance | null>(registerList, ref);

  return (
    <HeadlessList
      role="listbox"
      aria-label={label}
      {...rest}
      ref={setList}
      testId={testId}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          minHeight: 0,
          overflowY: "scroll",
        },
        style,
      )}
    >
      {Arr.map(rowRuns(rows, groupOf), (run, index) => {
        const group = Option.getOrUndefined(run.group);
        return (
          <HeadlessGroup
            key={`${group ?? "ungrouped"}-${index}`}
            {...(group === undefined
              ? {}
              : { role: "group", "aria-label": group })}
            style={{ display: "flex", flexDirection: "column" }}
          >
            {group === undefined ? null : (
              <HeadlessLabel
                testId="combobox-group"
                style={{
                  ...textStyle(theme, "caption"),
                  color: theme.colors.mutedForeground,
                  paddingLeft: theme.spacing.md,
                  paddingRight: theme.spacing.md,
                  paddingTop: theme.spacing.xs,
                  paddingBottom: theme.spacing.xs,
                  userSelect: "none",
                }}
              >
                {group}
              </HeadlessLabel>
            )}
            {Arr.map(run.values, (value) => (
              <ComboboxItem key={value} value={value} style={itemStyle} />
            ))}
          </HeadlessGroup>
        );
      })}
    </HeadlessList>
  );
};

/** {@link ComboboxItem} props. */
export interface ComboboxItemProps {
  /** The option's value. The label and description are read from the root. */
  readonly value: string;
  /** A style, or a function of the row's state (GPUix's `ComboboxItemState`). */
  readonly style?: StateStyle<ComboboxItemState>;
  readonly ref?: Ref<PublicInstance>;
}

/** Run `onHighlight` on the flip to highlighted; a stable state is a no-op. */
const RowBody = ({
  highlighted,
  onHighlight,
  children,
}: {
  readonly highlighted: boolean;
  readonly onHighlight: () => void;
  readonly children: ReactNode;
}) => {
  const was = useRef(false);
  useLayoutEffect(() => {
    if (highlighted && !was.current) onHighlight();
    was.current = highlighted;
  }, [highlighted, onHighlight]);
  return <>{children}</>;
};

/** One option row: label, description and the selected mark. */
export const ComboboxItem = ({ value, style, ref }: ComboboxItemProps) => {
  const theme = useTheme();
  const { options, selectedValues, labelFor, isDisabled, revealRow } =
    useCombobox();
  const option = optionOf(options, value);
  const selected = Arr.contains(selectedValues, value);
  const creates = Option.isSome(parseCreateValue(value));
  // State, not a ref: a headless row rebuilds its ref callback each render, so a
  // ref is briefly null while this subtree's layout effects run (the same reason
  // `MenuItem` keeps its instance in state).
  const [instance, setInstance] = useState<PublicInstance | undefined>(
    undefined,
  );
  const attach = useCallback((next: PublicInstance | null) => {
    setInstance(next ?? undefined);
  }, []);
  const setRow = useMergedRef<PublicInstance | null>(attach, ref);
  // The headless row owns the highlight; reveal on the flip, not on every
  // render, so a stable highlight never fights the caller's scroll (plan 535).
  const onHighlight = useCallback(() => {
    if (instance !== undefined) revealRow(instance);
  }, [instance, revealRow]);

  return (
    <HeadlessItem
      value={value}
      role="option"
      aria-selected={selected}
      disabled={isDisabled(value)}
      {...stateDescription(isDisabled(value))}
      testId={creates ? "combobox-option-create" : `combobox-option-${value}`}
      ref={setRow}
      style={(state) =>
        mergeStyles(rowStyle(theme, state), resolveStyle(style, state)) ??
        rowStyle(theme, state)
      }
    >
      {(state) => (
        <RowBody highlighted={state.highlighted} onHighlight={onHighlight}>
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
            <Icon
              name="check"
              color={theme.colors.primary}
              size="sm"
              label="Selected"
            />
          ) : null}
        </RowBody>
      )}
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
  const { loading } = useCombobox();

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
          {loading ? "Loading…" : "No matches"}
        </text>
      )}
    </HeadlessEmpty>
  );
};

export type { ComboboxOption } from "./combobox/logic.js";

/** GPUix's own state shape for one option row, re-exported for our consumers. */
export type { ComboboxItemState } from "@gpuix/react";

/** Every part of Combobox, so a misplaced sibling is named. */
const comboboxParts: ReadonlyArray<PartComponent> = [
  Combobox,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxInput,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
];

const comboboxRoot: PartsContract = {
  parent: "Combobox",
  family: comboboxParts,
  accepts: [ComboboxTrigger, ComboboxContent],
  hint: "Put ComboboxTrigger and ComboboxContent directly inside Combobox.",
};

const comboboxContent: PartsContract = {
  parent: "ComboboxContent",
  family: comboboxParts,
  accepts: [ComboboxInput, ComboboxList, ComboboxEmpty],
  hint: "Put ComboboxInput, ComboboxList and ComboboxEmpty directly inside ComboboxContent.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const comboboxMeta = {
  name: "Comboboxes",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  focusable: true,
  limitations: [
    "GPUix's filter is order-preserving, so the adapter feeds it pre-ranked items and controls inputValue",
    "selection yields option values, never labels",
    "a heading follows a contiguous run of equal `group` values: interleaving a group produces two headings",
    "no aria-activedescendant in 0.10.0: the highlighted row is visual while the input keeps focus",
    "no built-in request cancellation: debounce collapses a burst of edits, but a reply already in flight still lands, so the caller drops stale responses",
    "no separate loading row: while loading with nothing shown, the empty slot says Loading… (stale rows stay visible)",
    'the popup placement is corrected by the component: the runtime snaps but does not flip, and align="center" is measured from the trigger',
  ],
  docs: "docs/combobox.mdx",
  example: "examples/combobox.example.tsx",
  testFile: "src/behaviour/combobox.test.tsx",
} as const;
