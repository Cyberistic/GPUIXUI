/** @jsxImportSource @gpuix/react */
import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance, StyleDesc } from "@gpuix/react";
import {
  resolveStyle,
  type FloatingAlign,
  type FloatingSide,
  type StateStyle,
} from "@gpuix/react/floating";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import { pipe } from "effect";
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
import { accessibleName, visibleCopy } from "../core/a11y.js";
import { controlRing, keepContent } from "../core/focus.js";
import { revealScroll } from "../core/scroll.js";
import { storedList, storedText } from "../core/stored.js";
import type { ControlSpec } from "../core/style.js";
import { colorRole, controlSize } from "../core/theme.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { fieldVariant } from "../core/variants.js";
import { Icon } from "@gpuixui/icons";
import { elevationShadow } from "@gpuixui/tokens";
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
  type FieldHostProps,
  type HelpProps,
  type ValueChangeProps,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export type { SelectItemState, SelectTriggerState };

export interface PublicInstanceHolder {
  readonly current: PublicInstance | null;
}

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SelectOptionGroup {
  readonly label: string;
  readonly options: ReadonlyArray<SelectOption>;
}

export type SelectEntry = SelectOption | SelectOptionGroup;

export const isSelectGroup = (entry: SelectEntry): entry is SelectOptionGroup =>
  "options" in entry;

const storedOption = (entry: unknown): Option.Option<SelectOption> => {
  if (!P.isObject(entry)) return Option.none();
  const value = storedText(entry["value"]);
  if (value === undefined) return Option.none();
  return Option.some({
    value,

    label: storedText(entry["label"]) ?? "",
    disabled: entry["disabled"] === true,
  });
};

const storedEntry = (entry: unknown): Option.Option<SelectEntry> => {
  if (!P.isObject(entry) || !("options" in entry)) return storedOption(entry);
  const options = entry["options"];

  return Arr.isArray(options)
    ? Option.some({
        label: storedText(entry["label"]) ?? "",
        options: Arr.getSomes(Arr.map(options, storedOption)),
      })
    : Option.none();
};

export const selectEntries = (value: unknown): ReadonlyArray<SelectEntry> =>
  storedList(value, storedEntry);

export const selectOptions = (entries: unknown): ReadonlyArray<SelectOption> =>
  Arr.flatMap(selectEntries(entries), (entry) =>
    isSelectGroup(entry) ? entry.options : [entry],
  );

export const selectValueLabel = (
  entries: unknown,
  value: Option.Option<string>,
): Option.Option<string> =>
  pipe(
    value,
    Option.flatMap((chosen) =>
      Arr.findFirst(
        selectOptions(entries),
        (option) => option.value === chosen,
      ),
    ),
    Option.flatMap((option) =>
      Option.fromNullishOr(accessibleName(option.label)),
    ),
  );

export interface SelectProps
  extends ValueChangeProps<string>, FieldHostProps, HelpProps {
  readonly options: ReadonlyArray<SelectEntry>;

  readonly value?: string;
  readonly defaultValue?: string;

  readonly selectedValue?: string;
  readonly placeholder?: string;
  readonly disabled?: boolean;

  readonly open?: boolean;

  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;

  readonly invalid?: boolean;

  readonly size?: ControlSize;
  readonly fullWidth?: boolean;

  readonly side?: FloatingSide;

  readonly align?: FloatingAlign;

  readonly label?: string;

  readonly style?: StyleDesc;

  readonly triggerStyle?: StateStyle<SelectTriggerState>;

  readonly itemStyle?: StateStyle<SelectItemState>;

  readonly testId?: string;

  readonly triggerTestId?: string;

  readonly itemTestId?: (value: string) => string;
}

export const SelectIndicator = ({
  theme,
}: {
  readonly theme: PrimitiveTheme;
}) => {
  const capsule = colorRole(theme, "primary");
  const ink = colorRole(theme, "primaryForeground");
  const quiet = colorRole(theme, "mutedForeground");
  if (theme.interaction === "appkit") {
    return capsule === undefined || ink === undefined ? null : (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 16,
          height: 16,
          flexShrink: 0,
          borderRadius: 4,
          backgroundColor: capsule,
          pointerEvents: "none",
        }}
      >
        <Icon name="chevrons-up-down" size="xs" color={ink} />
      </div>
    );
  }
  return quiet === undefined ? null : (
    <Icon name="chevron-down" size="sm" color={quiet} />
  );
};

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
    if (theme.interaction === "appkit") {
      style = mergeStyle(style, {
        backgroundColor: colorRole(theme, "card"),
        boxShadow: elevationShadow(theme, "sm"),
      });
    }

    if (state.placeholder === true) {
      style = mergeStyle(style, { color: colorRole(theme, "placeholder") });
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

export const selectContentStyle = (theme: PrimitiveTheme): StyleDesc =>
  mergeStyle(recipeTw.classesToStyle(selectContentClass, theme).style, {
    maxHeight: 320,
    overflowY: "scroll",
  });

export const selectLabelStyle = (theme: PrimitiveTheme): StyleDesc =>
  recipeTw.classesToStyle(selectLabelClass, theme).style;

export const selectSeparatorStyle = (theme: PrimitiveTheme): StyleDesc =>
  recipeTw.classesToStyle(selectSeparatorClass, theme).style;

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

export const renderSelectRow = (
  option: SelectOption,
  theme: PrimitiveTheme,
  state: SelectItemState,
): ReactElement => {
  const mark = colorRole(theme, "popoverForeground");
  return (
    <div
      role="option"
      aria-label={accessibleName(option.label)}
      aria-selected={state.selected}
      style={recipeTw.classesToStyle(selectItemRowClass, theme).style}
    >
      {option.label}
      {}
      {state.selected && mark !== undefined ? (
        <Icon name="check" size="sm" color={mark} />
      ) : null}
    </div>
  );
};

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

export const renderSelect = (
  {
    options,
    value,
    defaultValue,
    selectedValue,
    onValueChange,
    onChange,
    placeholder,
    disabled,
    open,
    onOpenChange,
    invalid,
    size: requestedSize,
    fullWidth,
    side,
    align,
    label,
    description,
    ref,
    "aria-id": controlId,
    onLayout,
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
  const spec: ControlSpec = {
    variant: fieldVariant,
    size: controlSize(requestedSize),
    invalid,
    fullWidth,
  };
  const entries = selectEntries(options);
  const items = Arr.map(selectOptions(entries), (option) => ({
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

  const announced = Option.getOrUndefined(
    selectValueLabel(
      entries,
      Option.fromNullishOr(selectedValue ?? value ?? defaultValue),
    ),
  );
  return (
    <GpuixSelect
      items={items}
      value={value}
      defaultValue={defaultValue}
      onValueChange={valueChange({ onValueChange, onChange })}
      open={open}
      onOpenChange={onOpenChange}
      disabled={disabled}
      testId={testId}
      style={mergeStyle(
        { width: fullWidth === true ? "100%" : undefined },
        style,
      )}
    >
      <SelectTrigger
        ref={ref}
        disabled={disabled}
        testId={triggerTestId}
        role="combobox"
        aria-label={accessibleName(label)}
        aria-description={accessibleName(description)}
        aria-id={controlId}
        onLayout={onLayout}
        aria-expanded={open}
        aria-valuetext={announced}
        style={selectTriggerStyle(spec, theme, triggerStyle)}
      >
        <SelectValue placeholder={placeholder} />
        <SelectIndicator theme={theme} />
      </SelectTrigger>
      <SelectContent
        ref={scroller}
        side={side}
        align={align}
        role="listbox"
        style={selectContentStyle(theme)}
      >
        {Arr.map(entries, (entry, index) => {
          if (!isSelectGroup(entry)) return renderItem(entry);

          const caption = visibleCopy(entry.label);
          return (
            <Fragment key={`group-${index}`}>
              {index === 0 ? null : (
                <SelectSeparator style={selectSeparatorStyle(theme)} />
              )}
              {}
              <SelectGroup role="group" aria-label={accessibleName(caption)}>
                {caption === undefined ? null : (
                  <SelectLabel style={selectLabelStyle(theme)}>
                    {caption}
                  </SelectLabel>
                )}
                {}
                {...Arr.map(entry.options, renderItem)}
              </SelectGroup>
            </Fragment>
          );
        })}
      </SelectContent>
    </GpuixSelect>
  );
};

export const Select = (props: SelectProps): ReactElement => {
  const theme = useTheme();
  const scroller = useRef<PublicInstance | null>(null);

  const [held, setHeld] = useState(props.defaultOpen === true);

  const [heldValue, setHeldValue] = useState<string | undefined>(
    props.defaultValue,
  );
  const open = props.open ?? held;
  const notify = valueChange(props);
  return renderSelect(
    {
      ...props,
      open,
      selectedValue: props.selectedValue ?? props.value ?? heldValue,
      onValueChange: (next) => {
        if (props.value === undefined) setHeldValue(next);
        notify?.(next);
      },

      onChange: undefined,
      onOpenChange: (next) => {
        if (props.open === undefined) setHeld(next);
        props.onOpenChange?.(next);
      },
    },
    theme,
    scroller,
  );
};
