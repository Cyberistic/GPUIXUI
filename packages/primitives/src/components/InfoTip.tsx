/**
 * `InfoTip` — an information icon that explains a nearby term.
 *
 * A `Tooltip` needs a trigger that is a **focusable host element with a role
 * and a name** (plan 071). Hand-rolling that shape is easy to get wrong — a
 * bare `Box` has no `tabIndex`, no role and no focus ring, so the tip is
 * hover-only and invisible to assistive technology (that was a real bug in
 * `examples/basic-app`, plan 073). This component is the one honest shape:
 * a named `img` trigger with a focus ring, wrapping a decorative icon.
 *
 * `content` is a string because a string tip is also the trigger's
 * `aria-description`; a node tip would be painted but not announced, so the
 * type refuses the misleading case.
 */

import type { ReactElement } from "react";
import type { StyleDesc } from "@gpuix/react";
import type { FloatingSide } from "@gpuix/react/floating";
import { Icon, type IconName } from "@gpuixui/icons";
import { focusRing } from "@gpuixui/tokens";
import type { PrimitiveTheme } from "../core/theme.js";
import {
  ariaNameOr,
  mergeStyle,
  useFocus,
  type FocusState,
} from "./internal.js";
import { Tooltip } from "./Tooltip.js";
import { useTheme } from "./ThemeProvider.js";

export interface InfoTipProps {
  /** The explanation. Announced as the trigger's description. */
  readonly content: string;
  /**
   * The trigger's accessible name, e.g. "Revenue definition". A blank value
   * takes the documented "More information" fallback: the trigger is a focus
   * stop, and an unnamed one is the plan-073 failure.
   */
  readonly label: string;
  /** Defaults to `info`. */
  readonly icon?: IconName;
  /** Defaults to `top`, flipped when the tip does not fit above. */
  readonly side?: FloatingSide;
  /** The trigger's locator. */
  readonly testId?: string;
  /** The tip's locator; `testId` names the trigger. */
  readonly tipTestId?: string;
}

/** The trigger's box: icon-sized chrome, no colour of its own. */
export const infoTipTriggerStyle = (theme: PrimitiveTheme): StyleDesc => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing["2xs"],
  borderRadius: theme.radius.sm,
});

/** The element tree `InfoTip` renders. Pure in its arguments. */
export const renderInfoTip = (
  { content, label, icon = "info", side, testId, tipTestId }: InfoTipProps,
  theme: PrimitiveTheme,
  focus: FocusState = { focused: false, onFocus: () => {}, onBlur: () => {} },
): ReactElement => (
  <Tooltip content={content} side={side} testId={tipTestId}>
    <div
      role="img"
      aria-label={ariaNameOr(label, "More information")}
      tabIndex={0}
      testId={testId}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={mergeStyle(
        infoTipTriggerStyle(theme),
        focus.focused ? focusRing(theme) : undefined,
      )}
    >
      <Icon
        name={icon}
        color={theme.colors.mutedForeground}
        size={theme.iconSize.sm}
      />
    </div>
  </Tooltip>
);

/** An info icon whose tooltip explains a nearby term. */
export const InfoTip = (props: InfoTipProps): ReactElement =>
  renderInfoTip(props, useTheme(), useFocus());
