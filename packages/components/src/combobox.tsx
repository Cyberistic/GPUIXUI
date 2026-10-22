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
import {
  mergeStyles,
  resolveStyle,
  type FloatingContentProps,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import {
  cn,
  COMBOBOX_CARET,
  COMBOBOX_CONTENT,
  COMBOBOX_EMPTY,
  COMBOBOX_INPUT,
  COMBOBOX_ITEM,
  COMBOBOX_ITEM_DESCRIPTION,
  COMBOBOX_ITEM_MARK,
  COMBOBOX_ITEM_TEXT,
  COMBOBOX_LIST,
  COMBOBOX_TRIGGER,
  COMBOBOX_TRIGGER_TEXT,
} from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  createRowQuery,
  createRowValue,
  filterOptions,
  isCreateRow,
  labelOf,
  offersCreate,
  type ComboboxOption,
} from "./combobox/logic.js";
import { useControllableState } from "./internal/controllable.js";
import { fieldHint, hintHost, renderFieldHint } from "@gpuixui/primitives/hint";
import { dismissTopLayer, pushDismissLayer } from "./internal/dismiss-layer.js";
import { DismissScope, useDismissDepth } from "./internal/dismiss-scope.js";
import { isDismiss } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { fadeFromAnchor, useSurfaceTiming } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { useMergedRef } from "./internal/ref.js";
import {
  controlHeight,
  controlRing,
  keepContent,
  nativeTextTheme,
  useTheme,
  type Theme,
} from "./internal/theme.js";
import { usePlacement } from "./internal/use-placement.js";

/** What a selection callback receives: one value, several, or none. */
export type ComboboxSelection = string | null | ReadonlyArray<string>;

/** The rules a combobox part follows; throws outside a {@link Combobox}. */
interface ComboboxContextValue {
  readonly options: ReadonlyArray<ComboboxOption>;
  readonly selectedValues: ReadonlyArray<string>;
  readonly open: boolean;
  readonly disabled: boolean;
  /** The text in the search field; the popup owns it through the runtime. */
  readonly query: string;
  readonly labelFor: (value: string) => string;
  readonly isDisabled: (value: string) => boolean;
  readonly trigger: RefObject<PublicInstance | null>;
  readonly registerTrigger: (instance: PublicInstance | null) => void;
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
  /**
   * A query that matched no option may be created. Single-select only; the root
   * reports the trimmed query and leaves the selection alone, because only the
   * caller can add the option.
   */
  readonly onCreate?: (query: string) => void;
  /** The create row's label for a query. Default `Create "…"`. */
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

/** The row's look in each interaction state. */
const rowStyle = (theme: Theme, state: ComboboxItemState): StyleDesc => ({
  ...recipeStyle(COMBOBOX_ITEM, theme),
  minHeight: controlHeight(theme, "sm"),
  cursor: state.disabled ? "not-allowed" : "pointer",
  backgroundColor: state.highlighted ? theme.colors.hover : undefined,
  color: state.selected
    ? theme.colors.foreground
    : theme.colors.popoverForeground,
  hover: state.disabled ? undefined : { backgroundColor: theme.colors.hover },
});

/**
 * The role a row's label paints.
 *
 * The label names its own colour in the recipe, so the row's inherited `color`
 * never reached it: a disabled row faded the whole row to 50% instead, which
 * composites the label into the popover fill (the state the menu row's comment
 * rejects). The disabled pair is measured on the popover, so the line states it.
 */
const labelColor = (
  theme: Theme,
  state: { readonly disabled: boolean; readonly selected: boolean },
): string =>
  state.disabled
    ? theme.colors.disabledForeground
    : state.selected
      ? theme.colors.foreground
      : theme.colors.popoverForeground;

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
  onCreate,
  createLabel = (query) => `Create "${query}"`,
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
  const create = offersCreate(
    visible,
    query,
    onCreate !== undefined && !multiple,
  )
    ? createRowValue(Str.trim(query))
    : undefined;
  const items =
    create === undefined
      ? Arr.map(visible, (option) => option.value)
      : Arr.append(
          Arr.map(visible, (option) => option.value),
          create,
        );

  assertParts(comboboxRoot, children);

  const labelFor = (value: string): string =>
    isCreateRow(value)
      ? createLabel(createRowQuery(value))
      : Option.match(optionOf(options, value), {
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

  // An open popup is a dismiss layer, so a combobox inside a dialog closes on
  // Escape before the dialog does: the stack consumes the event once and the
  // dialog's own layer is never reached.
  const depth = useDismissDepth();
  useLayoutEffect(() => {
    if (!open) return;
    return pushDismissLayer((event) => {
      restoreFocus.current = event.eventType === "keyDown";
      setOpen(false);
      setQuery("");
    }, depth);
  }, [depth, open]);

  return (
    <ComboboxContext.Provider
      value={{
        options,
        selectedValues,
        open,
        disabled,
        query,
        labelFor,
        isDisabled: (value) =>
          Option.exists(
            optionOf(options, value),
            (option) => option.disabled === true,
          ),
        trigger,
        registerTrigger: (instance) => {
          trigger.current = instance;
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
          if (typeof next === "string" && isCreateRow(next)) {
            onCreate?.(createRowQuery(next));
            restoreFocus.current = true;
            setQuery("");
            setOpen(false);
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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** Default `"combobox-trigger"`. */
  readonly testId?: string;
}

/** The closed control: the selected labels, the caret and `aria-expanded`. */
export const ComboboxTrigger = ({
  placeholder = "Select…",
  label,
  className,
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
  const isPlaceholder = selectedValues.length === 0;

  return (
    <HeadlessTrigger
      {...(label === undefined ? {} : { "aria-label": label })}
      aria-expanded={open}
      ref={registerTrigger}
      testId={testId}
      disabled={disabled}
      {...rest}
      style={mergeStyles(recipeStyle(cn(COMBOBOX_TRIGGER, className), theme), {
        height: controlHeight(theme, "md"),
        color: isPlaceholder
          ? theme.colors.mutedForeground
          : theme.colors.foreground,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        hover: disabled ? undefined : { backgroundColor: theme.colors.hover },
        ...controlRing(theme, { disabled }),
      })}
    >
      <text
        style={mergeStyles(recipeStyle(COMBOBOX_TRIGGER_TEXT, theme), {
          color: isPlaceholder
            ? theme.colors.mutedForeground
            : theme.colors.foreground,
        })}
      >
        {display}
      </text>
      <div style={recipeStyle(COMBOBOX_CARET, theme)}>
        <Icon
          name="chevron-down"
          size="xs"
          color={theme.colors.mutedForeground}
        />
      </div>
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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/**
 * The popup. It renders while the combobox is open, anchored by GPUix, and
 * arrives on the house entrance: a fade plus 4px of travel out from the side it
 * was asked to open at. There is no exit tween — the runtime's own content
 * unmounts the moment the root closes, so there is no box left to fade.
 */
export const ComboboxContent = ({
  side = "bottom",
  align = "start",
  sideOffset = 4,
  alignOffset = 0,
  collisionPadding = 8,
  className,
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
  const timing = useSurfaceTiming("normal");
  assertParts(comboboxContent, children);

  // The house entrance, entry only: GPUix's own `ComboboxContent` renders
  // nothing while the root is closed, so there is no box to keep mounted for an
  // exit tween. A surface's first motion frame is committed when its host
  // mounts, one commit before the measured flip can move it, so the travel
  // follows the side this popup was asked to open at; a popup the component
  // flips above its trigger keeps the entrance its requested side owns
  // (`behaviour/combobox.test.tsx`, "the popup's entrance").
  const frames = fadeFromAnchor(side, 4);

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
      motion={{
        initial: frames.initial,
        animate: frames.animate,
        transition: timing.enter,
      }}
      onMouseDownOutside={(event) => {
        noteOutsidePress();
        onMouseDownOutside?.(event);
      }}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(COMBOBOX_CONTENT, className), theme), {
          maxHeight: 280,
          overflowY: "scroll",
        }),
        style,
      )}
    >
      <DismissScope>{children}</DismissScope>
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
  const { query } = useCombobox();
  const fieldStyle = mergeStyles(recipeStyle(COMBOBOX_INPUT, theme), {
    height: controlHeight(theme, "sm"),
    ...controlRing(theme),
    ...keepContent,
  });
  const hint = fieldHint({ placeholder }, theme, query, {
    origin: "host",
    align: "center",
    style: fieldStyle,
  });

  return (
    <div style={hintHost({ width: "100%" })}>
      <HeadlessInput
        testId="combobox-input"
        aria-label={label}
        // The headless field forwards the host theme; its own fill is `input`.
        // The hint is painted, because the host's placeholder is a fixed grey.
        theme={nativeTextTheme(theme, "input")}
        onKeyDown={(event) => {
          if (isDismiss(event)) dismissTopLayer(event);
        }}
        style={fieldStyle}
      />
      {Option.match(hint, {
        onNone: () => null,
        onSome: (painted) => renderFieldHint(painted, "combobox-input"),
      })}
    </div>
  );
};

/** {@link ComboboxList} props. */
export interface ComboboxListProps extends Omit<HeadlessListProps, "children"> {
  /** The listbox's accessible name. Default `"Options"`. */
  readonly label?: string;
  /** A style for every option row, or a function of its state. */
  readonly itemStyle?: StateStyle<ComboboxItemState>;
}

/** The listbox: one {@link ComboboxItem} per visible option, in ranked order. */
export const ComboboxList = ({
  label = "Options",
  itemStyle,
  style,
  ...rest
}: ComboboxListProps) => {
  const theme = useTheme();
  return (
    <HeadlessList
      role="listbox"
      aria-label={label}
      {...rest}
      style={mergeStyles(recipeStyle(COMBOBOX_LIST, theme), style)}
    >
      {(item) => <ComboboxItem key={item} value={item} style={itemStyle} />}
    </HeadlessList>
  );
};

/** {@link ComboboxItem} props. */
export interface ComboboxItemProps {
  /** The option's value. The label and description are read from the root. */
  readonly value: string;
  /** A style, or a function of the row's state (GPUix's `ComboboxItemState`). */
  readonly style?: StateStyle<ComboboxItemState>;
}

/** One option row: label, description and the selected mark. */
export const ComboboxItem = ({ value, style }: ComboboxItemProps) => {
  const theme = useTheme();
  const { options, selectedValues, labelFor, isDisabled } = useCombobox();
  const option = optionOf(options, value);
  const selected = Arr.contains(selectedValues, value);
  const disabled = isDisabled(value);
  const color = labelColor(theme, { disabled, selected });

  return (
    <HeadlessItem
      value={value}
      role="option"
      aria-selected={selected}
      disabled={disabled}
      testId={
        isCreateRow(value) ? "combobox-create" : `combobox-option-${value}`
      }
      style={(state) =>
        mergeStyles(rowStyle(theme, state), resolveStyle(style, state)) ??
        rowStyle(theme, state)
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
          style={mergeStyles(recipeStyle(COMBOBOX_ITEM_TEXT, theme), { color })}
        >
          {labelFor(value)}
        </text>
        {Option.match(option, {
          onNone: () => null,
          onSome: (candidate) =>
            candidate.description === undefined ? null : (
              <text
                style={mergeStyles(
                  recipeStyle(COMBOBOX_ITEM_DESCRIPTION, theme),
                  {
                    color: disabled
                      ? theme.colors.disabledForeground
                      : theme.colors.mutedForeground,
                  },
                )}
              >
                {candidate.description}
              </text>
            ),
        })}
      </div>
      {selected ? (
        <div style={recipeStyle(COMBOBOX_ITEM_MARK, theme)}>
          <Icon
            name="check"
            size="xs"
            color={theme.colors.primary}
            label="Selected"
          />
        </div>
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
        <text style={recipeStyle(COMBOBOX_EMPTY, theme)}>No matches</text>
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
  limitations: [
    "GPUix's filter is order-preserving, so the adapter feeds it pre-ranked items and controls inputValue",
    "selection yields option values, never labels",
    "no aria-activedescendant in 0.11.0: the highlighted row is visual while the input keeps focus",
    "create-new is single-select only, is offered when the query matches no option, and reports the query — the caller adds the option and owns the selection",
    "no async options",
    'the popup placement is corrected by the component: the runtime snaps but does not flip, and align="center" is measured from the trigger',
    "the popup has an entry tween only (a fade plus 4px out from its measured side): the runtime's ComboboxContent renders nothing while closed, so a closing popup cannot stay mounted for an exit",
  ],
  docs: "docs/combobox.mdx",
  example: "examples/combobox.example.tsx",
  testFile: "src/behaviour/combobox.test.tsx",
} as const;
