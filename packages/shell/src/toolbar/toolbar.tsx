/**
 * Toolbar: a horizontal action strip with a roving tab stop and an overflow menu.
 *
 * A `role="toolbar"` row of actions: one tab stop roves between them, the arrow
 * keys move it (wrapping and skipping disabled actions), and an optional `max`
 * overflows the tail into a menu behind an ellipsis trigger. The roving and the
 * overflow split are pure (`logic.ts`); this component wires them to focus and
 * renders the strip.
 *
 * The strip's anatomy is the window's: a leading group of actions, a flexible
 * spacer, then the trailing group — an optional `ToggleGroup` of view modes and
 * the overflow trigger. Actions are the primitives' `Button` (a `ghost`, `sm`
 * one, with its icon as the leading slot), the trigger is an `IconButton`, the
 * rule between groups is a `Separator`, and a mode group is a `ToggleGroup`, so
 * the chrome owns no button of its own.
 */

import type { KeyEvent, Props, PublicInstance, StyleDesc } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  FloatingLayer,
  floatingRootStyle,
  mergeStyles,
} from "@gpuix/react/floating";
import { Icon, type IconName } from "@gpuixui/icons";
import {
  Button,
  IconButton,
  isPlainKey,
  Separator,
  ToggleGroup,
} from "@gpuixui/primitives";
import { cn, MENU_CONTENT, MENU_ITEM } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Fragment, useRef, useState } from "react";
import { recipeStyle } from "../recipe.js";
import { disabledOpacity, useTheme } from "../theme.js";
import type { Theme } from "../theme.js";
import {
  initialRoving,
  moveRoving,
  splitOverflow,
  type ToolbarItemSpec,
} from "./logic.js";

const TOOLBAR =
  "flex w-full flex-row items-center gap-1 border-b border-input bg-card px-2 py-1";
const TOOLBAR_ITEM_LABEL = "text-sm font-medium font-sans";

/** One action in the strip. */
export interface ToolbarAction {
  readonly id: string;
  readonly label: string;
  readonly icon?: IconName;
  /** A label shared by adjacent actions; a separator falls between groups. */
  readonly group?: string;
  readonly disabled?: boolean;
}

/** One mode the toolbar's trailing `ToggleGroup` offers. */
export interface ToolbarMode {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
}

/** {@link Toolbar} props. */
export interface ToolbarProps extends Omit<Props, "children"> {
  /** The toolbar's accessible name. */
  readonly label?: string;
  readonly actions: ReadonlyArray<ToolbarAction>;
  /** Maximum visible slots (a count); the overflow trigger takes one. */
  readonly max?: number;
  /** Called when an action is activated. */
  readonly onAction?: (id: string) => void;
  /** The trailing mode group. Omit to draw no group. */
  readonly modes?: ReadonlyArray<ToolbarMode>;
  /** The pressed mode, when the group is controlled. */
  readonly mode?: string;
  /** Called when a mode is pressed. */
  readonly onModeChange?: (id: string) => void;
  /** The modes group's accessible name. Defaults to `View`. */
  readonly modesLabel?: string;
  readonly className?: string;
}

/** A slot is a visible action, or the overflow trigger after them. */
const isOverflowSlot = (slot: number, visibleCount: number): boolean =>
  slot === visibleCount;

const overflowItemStyle = (theme: Theme, disabled: boolean): StyleDesc => ({
  ...recipeStyle(MENU_ITEM, theme),
  ...(disabled ? { opacity: disabledOpacity } : {}),
  cursor: disabled ? "not-allowed" : "pointer",
});

/** The horizontal action strip. */
export const Toolbar = ({
  label,
  actions,
  max,
  onAction,
  modes,
  mode,
  onModeChange,
  modesLabel = "View",
  className,
  style,
  ...rest
}: ToolbarProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;

  const specs: ReadonlyArray<ToolbarItemSpec> = Arr.map(actions, (action) => ({
    id: action.id,
    disabled: action.disabled === true,
  }));
  const split =
    max === undefined
      ? { visible: specs, overflow: [] as ReadonlyArray<ToolbarItemSpec> }
      : splitOverflow(specs, max);
  const visibleCount = Arr.length(split.visible);
  const hasOverflow = Arr.length(split.overflow) > 0;
  const slotCount = visibleCount + (hasOverflow ? 1 : 0);
  const modeOptions = Arr.map(modes ?? [], (candidate) => ({
    value: candidate.id,
    label: candidate.label,
    disabled: candidate.disabled === true,
  }));

  const isDisabled = (slot: number): boolean =>
    isOverflowSlot(slot, visibleCount)
      ? false
      : (split.visible[slot]?.disabled ?? true);

  const [roving, setRoving] = useState<Option.Option<number>>(() =>
    initialRoving(slotCount, isDisabled),
  );
  const [overflowOpen, setOverflowOpen] = useState(false);

  const refs = useRef<Array<PublicInstance | null>>([]);
  const overflowRef = useRef<PublicInstance | null>(null);

  const focusSlot = (slot: number): void => {
    const target = refs.current[slot];
    if (target !== null && target !== undefined) {
      renderer?.focusElement?.(target.id);
    }
  };

  const handleKeyDown = (event: KeyEvent): void => {
    const key = event.key ?? "";
    if (!isPlainKey(event.modifiers)) return;
    if (key !== "left" && key !== "right") return;
    const next = moveRoving(
      Option.getOrElse(roving, () => 0),
      slotCount,
      key === "right" ? 1 : -1,
      isDisabled,
    );
    setRoving(next);
    Option.map(next, focusSlot);
  };

  const closeOverflow = (): void => {
    setOverflowOpen(false);
    if (overflowRef.current !== null)
      renderer?.focusElement?.(overflowRef.current.id);
  };

  return (
    <div
      role="toolbar"
      {...(label === undefined ? {} : { "aria-label": label })}
      {...rest}
      onKeyDown={handleKeyDown}
      style={mergeStyles(
        mergeStyles(
          recipeStyle(cn(TOOLBAR, className), theme),
          floatingRootStyle(),
        ),
        style,
      )}
    >
      {Arr.map(Arr.take(actions, visibleCount), (action, index) => {
        const disabled = action.disabled === true;
        const groupBefore =
          index === 0
            ? false
            : (actions[index - 1]?.group ?? undefined) !==
              (action.group ?? undefined);
        return (
          <Fragment key={action.id}>
            {groupBefore ? (
              <Separator orientation="vertical" className="h-4" />
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              label={action.label}
              disabled={disabled}
              tabIndex={Option.contains(roving, index) ? 0 : -1}
              testId={`toolbar-action-${action.id}`}
              ref={(instance) => {
                refs.current[index] = instance;
              }}
              onActivate={() => onAction?.(action.id)}
              leading={
                action.icon === undefined ? undefined : (
                  <Icon
                    name={action.icon}
                    color={
                      disabled
                        ? theme.colors.disabledForeground
                        : theme.colors.foreground
                    }
                    size="sm"
                  />
                )
              }
            >
              <text
                style={{
                  ...recipeStyle(TOOLBAR_ITEM_LABEL, theme),
                  color: disabled
                    ? theme.colors.disabledForeground
                    : theme.colors.foreground,
                }}
              >
                {action.label}
              </text>
            </Button>
          </Fragment>
        );
      })}

      <div style={{ flexGrow: 1, flexBasis: 0 }} />

      {modeOptions.length === 0 ? null : (
        <Fragment>
          <Separator orientation="vertical" className="h-4" />
          <ToggleGroup
            type="single"
            label={modesLabel}
            size="sm"
            options={modeOptions}
            {...(mode === undefined ? {} : { value: mode })}
            onValueChange={onModeChange}
            itemTestId={(id) => `toolbar-mode-${id}`}
          />
        </Fragment>
      )}

      {hasOverflow ? (
        <Fragment>
          <IconButton
            label="More actions"
            size="sm"
            aria-haspopup="menu"
            aria-expanded={overflowOpen}
            testId="toolbar-overflow"
            tabIndex={Option.contains(roving, visibleCount) ? 0 : -1}
            ref={(instance) => {
              refs.current[visibleCount] = instance;
              overflowRef.current = instance;
            }}
            onActivate={() => setOverflowOpen((open) => !open)}
            icon={<Icon name="ellipsis" color={theme.colors.foreground} />}
          />
          {overflowOpen ? (
            <FloatingLayer
              role="menu"
              aria-label="More actions"
              tabIndex={-1}
              side="bottom"
              align="end"
              sideOffset={2}
              onKeyDown={(event) => {
                if (event.key === "escape") {
                  event.preventDefault();
                  closeOverflow();
                }
              }}
              style={recipeStyle(cn(MENU_CONTENT, "min-w-40"), theme)}
            >
              {Arr.map(Arr.drop(actions, visibleCount), (action) => {
                const disabled = action.disabled === true;
                return (
                  <div
                    key={action.id}
                    role="menuitem"
                    aria-disabled={disabled}
                    testId={`toolbar-overflow-item-${action.id}`}
                    onClick={() => {
                      if (disabled) return;
                      onAction?.(action.id);
                      setOverflowOpen(false);
                    }}
                    style={overflowItemStyle(theme, disabled)}
                  >
                    <text
                      style={{
                        ...recipeStyle(TOOLBAR_ITEM_LABEL, theme),
                        color: disabled
                          ? theme.colors.disabledForeground
                          : theme.colors.popoverForeground,
                      }}
                    >
                      {action.label}
                    </text>
                  </div>
                );
              })}
            </FloatingLayer>
          ) : null}
        </Fragment>
      ) : null}
    </div>
  );
};
