/** @jsxImportSource @gpuix/react */
import {
  Combobox as HeadlessCombobox,
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
  FloatingLayer,
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
  optionsOf,
  selectionOf,
  type ComboboxOption,
} from "./combobox/logic.js";
import { useControllableState } from "./internal/controllable.js";
import {
  fieldHelp,
  fieldHint,
  hintHost,
  renderFieldHint,
} from "@gpuixui/primitives/hint";
import { dismissTopLayer, pushDismissLayer } from "./internal/dismiss-layer.js";
import { DismissScope, useDismissDepth } from "./internal/dismiss-scope.js";
import { isDismiss } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import {
  fadeFromAnchor,
  PresenceShield,
  presenceMotion,
  presenceStyle,
  useSurfacePresence,
  useSurfaceTiming,
} from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { useMergedRef } from "./internal/ref.js";
import {
  controlHeight,
  controlRing,
  disabledFade,
  keepContent,
  nativeTextTheme,
  selectionWash,
  useTheme,
  type Theme,
} from "./internal/theme.js";
import { usePlacement } from "./internal/use-placement.js";

export type ComboboxSelection = string | null | ReadonlyArray<string>;

interface ComboboxContextValue {
  readonly options: ReadonlyArray<ComboboxOption>;
  readonly selectedValues: ReadonlyArray<string>;
  readonly open: boolean;
  readonly disabled: boolean;

  readonly loading: boolean;

  readonly query: string;
  readonly labelFor: (value: string) => string;
  readonly isDisabled: (value: string) => boolean;
  readonly trigger: RefObject<PublicInstance | null>;
  readonly registerTrigger: (instance: PublicInstance | null) => void;

  readonly close: () => void;

  readonly noteOutsidePress: () => void;
}

const ComboboxContext = createContext<ComboboxContextValue | undefined>(
  undefined,
);

const useCombobox = (): ComboboxContextValue => {
  const value = useContext(ComboboxContext);
  if (value === undefined) {
    throw new Error("Combobox parts must be used inside Combobox");
  }
  return value;
};

export interface ComboboxProps {
  readonly options: ReadonlyArray<ComboboxOption>;

  readonly value?: string | ReadonlyArray<string>;

  readonly defaultValue?: string | ReadonlyArray<string>;
  readonly onValueChange?: (value: ComboboxSelection) => void;

  readonly multiple?: boolean;
  readonly disabled?: boolean;

  readonly onCreate?: (query: string) => void;

  readonly createLabel?: (query: string) => string;

  readonly onQueryChange?: (query: string) => void;

  readonly shouldFilter?: boolean;

  readonly loading?: boolean;
  readonly children?: PartChildren;
}

const toRuntimeValue = (
  value: Option.Option<string | ReadonlyArray<string>>,
  multiple: boolean,
): ComboboxValue | undefined =>
  Option.match(value, {
    onNone: () => undefined,
    onSome: (chosen) =>
      multiple
        ? typeof chosen === "string"
          ? [chosen]
          : [...chosen]
        : typeof chosen === "string"
          ? chosen
          : (chosen[0] ?? null),
  });

const optionOf = (
  options: ReadonlyArray<ComboboxOption>,
  value: string,
): Option.Option<ComboboxOption> =>
  Arr.findFirst(options, (option) => option.value === value);

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

const labelColor = (
  theme: Theme,
  state: { readonly disabled: boolean; readonly selected: boolean },
): string =>
  state.disabled
    ? theme.colors.disabledForeground
    : state.selected
      ? theme.colors.foreground
      : theme.colors.popoverForeground;

export const Combobox = ({
  options,
  value: valueProp,
  defaultValue,
  onValueChange,
  multiple = false,
  disabled = false,
  onCreate,
  createLabel = (query) => `Create "${query}"`,
  onQueryChange,
  shouldFilter = true,
  loading = false,
  children,
}: ComboboxProps) => {
  const renderer = useGpuix().renderer;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const trigger = useRef<PublicInstance | null>(null);
  const restoreFocus = useRef(false);
  const wasOpen = useRef(false);

  const labelWrite = useRef<Option.Option<string>>(Option.none());

  const timing = useSurfaceTiming("normal");
  const presence = useSurfacePresence(open, timing);

  useLayoutEffect(() => {
    if (presence.mounted) return;
    setQuery("");
  }, [presence.mounted]);

  const onQueryChangeRef = useRef(onQueryChange);
  useLayoutEffect(() => {
    onQueryChangeRef.current = onQueryChange;
  });

  useLayoutEffect(() => {
    if (!open || disabled) return;
    onQueryChangeRef.current?.(query);
  }, [disabled, open, query]);

  const [selected, setSelected] = useControllableState<ComboboxValue>({
    value: toRuntimeValue(selectionOf(valueProp), multiple),
    defaultValue:
      toRuntimeValue(selectionOf(defaultValue), multiple) ??
      (multiple ? [] : null),
    onChange: onValueChange,
  });

  const selectedValues: ReadonlyArray<string> = Array.isArray(selected)
    ? selected
    : selected === null
      ? []
      : [selected];

  const optionList = optionsOf(options);
  const visible =
    shouldFilter === true ? filterOptions(optionList, query) : optionList;
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
      : Option.match(optionOf(optionList, value), {
          onNone: () => value,
          onSome: labelOf,
        });

  useLayoutEffect(() => {
    if (!disabled) return;
    setOpen(false);
  }, [disabled]);

  useLayoutEffect(() => {
    if (wasOpen.current && !open && restoreFocus.current) {
      const instance = trigger.current;
      if (instance !== null) renderer?.focusElement?.(instance.id);
    }
    if (!open) restoreFocus.current = false;
    wasOpen.current = open;
  }, [open, renderer]);

  const depth = useDismissDepth();
  useLayoutEffect(() => {
    if (!open) return;
    return pushDismissLayer((event) => {
      restoreFocus.current = event.eventType === "keyDown";
      setOpen(false);
    }, depth);
  }, [depth, open]);

  useLayoutEffect(() => {
    labelWrite.current = Option.none();
  });

  return (
    <ComboboxContext.Provider
      value={{
        options: optionList,
        selectedValues,
        open,
        disabled,
        loading,
        query,
        labelFor,
        isDisabled: (value) =>
          Option.exists(
            optionOf(optionList, value),
            (option) => option.disabled === true,
          ),
        trigger,
        close: () => setOpen(false),
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
          labelWrite.current = Option.fromNullishOr(
            typeof next === "string" ? labelFor(next) : null,
          );
          if (typeof next === "string" && isCreateRow(next)) {
            onCreate?.(createRowQuery(next));
            restoreFocus.current = true;
            setOpen(false);
            return;
          }
          restoreFocus.current = !multiple;
          setSelected(next);
        }}
        inputValue={query}
        onInputValueChange={(next) => {
          const written = labelWrite.current;
          labelWrite.current = Option.none();
          if (!open) return;
          if (Option.exists(written, (label) => label === next)) return;
          setQuery(next);
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

export interface ComboboxTriggerProps extends Omit<
  HeadlessTriggerProps,
  "children"
> {
  readonly placeholder?: string;

  readonly label?: string;

  readonly className?: string;

  readonly testId?: string;
}

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
        ...disabledFade(disabled),
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

export interface ComboboxContentProps extends FloatingContentProps {
  readonly side?: "top" | "right" | "bottom" | "left";

  readonly align?: "start" | "center" | "end";

  readonly sideOffset?: number;

  readonly alignOffset?: number;

  readonly className?: string;
  readonly children?: PartChildren;
}

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
  const { close, noteOutsidePress, open, trigger } = useCombobox();
  const surface = useRef<PublicInstance | null>(null);
  const setSurface = useMergedRef<PublicInstance | null>(surface, ref);
  const timing = useSurfaceTiming("normal");
  const presence = useSurfacePresence(open, timing);
  const placement = usePlacement({
    open: presence.mounted,
    side,
    align,
    margin: collisionPadding,
    trigger,
    surface,
  });
  assertParts(comboboxContent, children);

  if (!open && !presence.mounted) return null;

  const frames = fadeFromAnchor(side, 4);

  return (
    <FloatingLayer
      testId="combobox-content"
      motion={presenceMotion(frames, presence)}
      side={placement.side}
      align={placement.align}
      sideOffset={sideOffset}
      alignOffset={placement.alignOffset + alignOffset}
      collisionPadding={collisionPadding}
      ref={setSurface}
      {...rest}
      onMouseDownOutside={(event) => {
        noteOutsidePress();
        onMouseDownOutside?.(event);
        close();
      }}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(COMBOBOX_CONTENT, className), theme), {
          maxHeight: 280,
          overflowY: "scroll",

          position: "relative",
          ...presenceStyle(presence.present),
        }),
        style,
      )}
    >
      <DismissScope>{children}</DismissScope>
      <PresenceShield present={presence.present} />
    </FloatingLayer>
  );
};

export interface ComboboxInputProps {
  readonly placeholder?: string;

  readonly label?: string;
}

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
    ...selectionWash(theme),
  });
  const hint = fieldHint({ placeholder }, theme, query, {
    origin: "host",
    align: "center",
    style: fieldStyle,
  });

  return (
    <div
      style={hintHost({
        width: "100%",

        flexShrink: 0,
        paddingBottom: theme.spacing.xs,
      })}
    >
      <HeadlessInput
        testId="combobox-input"
        aria-label={label}
        aria-description={fieldHelp({ placeholder }, query)}
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

export interface ComboboxListProps extends Omit<HeadlessListProps, "children"> {
  readonly label?: string;

  readonly itemStyle?: StateStyle<ComboboxItemState>;
}

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

export interface ComboboxItemProps {
  readonly value: string;

  readonly style?: StateStyle<ComboboxItemState>;
}

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

export interface ComboboxEmptyProps {
  readonly children?: ReactNode;
}

export const ComboboxEmpty = ({ children }: ComboboxEmptyProps) => {
  const theme = useTheme();
  const { loading } = useCombobox();

  return (
    <HeadlessEmpty testId="combobox-empty">
      {children ?? (
        <text style={recipeStyle(COMBOBOX_EMPTY, theme)}>
          {loading ? "Searching…" : "No matches"}
        </text>
      )}
    </HeadlessEmpty>
  );
};

export type { ComboboxOption } from "./combobox/logic.js";

export type { ComboboxItemState } from "@gpuix/react";

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
    "async is the caller's: onQueryChange reports each search and shouldFilter={false} paints the rows a remote search already chose and ranked; the component neither fetches nor debounces",
    'the popup placement is corrected by the component: the runtime snaps but does not flip, and align="center" is measured from the trigger',
    "the popup is the one surface whose rows are the runtime's own list: it keeps them for its exit, so a dismissed popup fades in the state it was dismissed in rather than re-filtering under the reader",
  ],
  docs: "docs/combobox.mdx",
  example: "examples/combobox.example.tsx",
  testFile: "src/behaviour/combobox.test.tsx",
} as const;
