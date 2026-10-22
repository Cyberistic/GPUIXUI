/**
 * Alert: a persistent, in-flow message about the current context.
 *
 * In-flow, not floating: an alert occupies its place in the layout and stays
 * until the state it describes changes. A message that appears and leaves on its
 * own is a toast; a message that blocks the window is a dialog.
 *
 * Compound parts (`docs/component-api.md` §8): the root owns `role="alert"` and
 * the tone; `AlertIcon`, `AlertContent`, `AlertTitle`, `AlertDescription`,
 * `AlertLink` and `AlertDismiss` read that tone through a context, so a part is
 * never given a duplicated `tone` prop. The resting appearance is a Tailwind
 * recipe (`ALERT_*`), compiled against shadcn's fixed metrics; the caller's
 * `className` is joined after each part's recipe and its `style` is merged last.
 * The tone's readable foreground is still one dynamic value, so the icon and
 * title paint it through `style`; a link action's colour is derived against the
 * message's own tint, which is not a page surface.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import {
  ALERT_BASE,
  ALERT_CONTENT,
  ALERT_DESCRIPTION,
  ALERT_ICON,
  ALERT_TITLE,
  ALERT_TONES,
  cn,
} from "@gpuixui/tw";
import { createContext, useContext } from "react";
import { IconButton } from "./internal/button.js";
import { activationHandlers } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { recipeStyle } from "./internal/recipe.js";
import {
  keyboardRing,
  messageLink,
  targetSize,
  tone,
  useTheme,
} from "./internal/theme.js";

/** The four status tones an alert can carry. */
export type AlertTone = "info" | "success" | "warning" | "danger";

interface AlertContextValue {
  /** The root's tone, so a part can paint its own region. */
  readonly tone: AlertTone;
  /** The tone's readable text colour on the soft surface. */
  readonly foreground: string;
}

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

/** The root's tone. A part outside an alert is a composition error. */
const useAlert = (): AlertContextValue => {
  const value = useContext(AlertContext);
  if (value === undefined) {
    throw new Error("Alert parts must be used inside Alert");
  }
  return value;
};

/** {@link Alert} props. */
export interface AlertProps extends Omit<Props, "children"> {
  /** Default `"info"`. */
  readonly tone?: AlertTone;
  readonly className?: string;
  readonly children?: PartChildren;
}

/**
 * The tone-tinted surface and the alert live region.
 * Defaults to `info`, so an unqualified alert reads as neutral information.
 */
export const Alert = ({
  tone: value = "info",
  className,
  children,
  style,
  ...rest
}: AlertProps) => {
  const theme = useTheme();
  const { fg } = tone(theme, value);
  assertParts(alertRoot, children);

  return (
    <AlertContext.Provider value={{ tone: value, foreground: fg }}>
      <div
        role="alert"
        {...rest}
        style={mergeStyles(
          recipeStyle(cn(ALERT_BASE, ALERT_TONES[value], className), theme),
          style,
        )}
      >
        {children}
      </div>
    </AlertContext.Provider>
  );
};

/** {@link AlertIcon} props. */
export interface AlertIconProps extends Props {
  readonly className?: string;
}

/** The leading glyph, painted in the tone's foreground. */
export const AlertIcon = ({ className, style, ...rest }: AlertIconProps) => {
  const theme = useTheme();
  const { foreground } = useAlert();

  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(ALERT_ICON, className), theme), {
          color: foreground,
        }),
        style,
      )}
    />
  );
};

/** {@link AlertContent} props. */
export interface AlertContentProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: PartChildren;
}

/** The growing column between the glyph and the dismiss control. */
export const AlertContent = ({
  className,
  children,
  style,
  ...rest
}: AlertContentProps) => {
  const theme = useTheme();
  assertParts(alertContent, children);

  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(ALERT_CONTENT, className), theme),
        style,
      )}
    >
      {children}
    </div>
  );
};

/** {@link AlertTitle} props. */
export interface AlertTitleProps extends Props {
  readonly className?: string;
}

/** The heading. It always uses the tone's readable foreground. */
export const AlertTitle = ({ className, style, ...rest }: AlertTitleProps) => {
  const theme = useTheme();
  const { foreground } = useAlert();

  return (
    <text
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(ALERT_TITLE, className), theme), {
          color: foreground,
        }),
        style,
      )}
    />
  );
};

/** {@link AlertDescription} props. */
export interface AlertDescriptionProps extends Props {
  readonly className?: string;
}

/**
 * Body prose in the page foreground rather than the tone's, because body text
 * has to stay readable on the tint. It is a container, so it may hold an action.
 */
export const AlertDescription = ({
  className,
  style,
  ...rest
}: AlertDescriptionProps) => {
  const theme = useTheme();

  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(ALERT_DESCRIPTION, className), theme),
        style,
      )}
    />
  );
};

/** {@link AlertDismiss} props. */
export interface AlertDismissProps extends Omit<Props, "children"> {
  /** The dismiss handler. Required, so a dismiss control always does something. */
  readonly onDismiss: () => void;
  /** The accessible name. Default `"Dismiss"`. */
  readonly label?: string;
}

/** The focusable dismiss control; omitted from the composition when unwanted. */
export const AlertDismiss = ({
  onDismiss,
  label = "Dismiss",
  ...rest
}: AlertDismissProps) => {
  const theme = useTheme();
  return (
    <IconButton
      {...rest}
      size="sm"
      label={label}
      testId="alert-dismiss"
      onClick={onDismiss}
    >
      <Icon name="x" size="sm" color={theme.colors.foreground} />
    </IconButton>
  );
};

/** {@link AlertLink} props. */
export interface AlertLinkProps extends Props {
  /** Called on click, or on Enter/Space while the link holds focus. */
  readonly onSelect?: () => void;
  readonly className?: string;
}

/**
 * A text action inside the message: "Try again", "View the log", "Learn more".
 *
 * It paints the brand **derived against this message's own tint** rather than
 * the shared link colour, because a tint is not a page surface: measured, the
 * page's brand is under the text floor on 29 of the 64 tint placements the
 * shipped styles carry (`brandTextOn` in `@gpuixui/tokens`). The run tints no
 * wash of its own, so the underline is the pointer cue and the tint is the only
 * surface the colour is read on. It is a block-level row, so it starts its own
 * line inside `AlertDescription`.
 */
export const AlertLink = ({
  onSelect,
  onClick,
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  className,
  style,
  children,
  ...rest
}: AlertLinkProps) => {
  const theme = useTheme();
  const { tone: value } = useAlert();

  return (
    <div
      role="link"
      tabIndex={0}
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        onSelect?.();
      }}
      {...activationHandlers(() => onSelect?.(), { onKeyDown, onKeyUp })}
      onFocus={(event) => onFocus?.(event)}
      onBlur={(event) => onBlur?.(event)}
      style={mergeStyles(
        mergeStyles(
          recipeStyle(
            cn(
              ALERT_DESCRIPTION,
              "flex flex-row items-center self-start",
              className,
            ),
            theme,
          ),
          {
            // A pressable target, not a run of prose: the target floor is the
            // same 24px every clear and remove control reaches.
            height: targetSize.minimum,
            color: messageLink(theme, value),
            hover: { textDecoration: "underline" },
            cursor: "pointer",
            ...keyboardRing(theme),
          },
        ),
        style,
      )}
    >
      {children}
    </div>
  );
};

/** Every part of Alert, so a misplaced sibling is named. */
const alertParts: ReadonlyArray<PartComponent> = [
  Alert,
  AlertIcon,
  AlertContent,
  AlertTitle,
  AlertDescription,
  AlertDismiss,
  AlertLink,
];

const alertRoot: PartsContract = {
  parent: "Alert",
  family: alertParts,
  accepts: [
    AlertIcon,
    AlertContent,
    AlertTitle,
    AlertDescription,
    AlertDismiss,
    AlertLink,
  ],
  hint: "Put the icon, content and dismiss control directly inside Alert.",
};

const alertContent: PartsContract = {
  parent: "AlertContent",
  family: alertParts,
  accepts: [AlertTitle, AlertDescription],
  hint: "Put AlertTitle and AlertDescription directly inside AlertContent.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const alertMeta = {
  name: "Alerts",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "the dismiss control is this package's local button until @gpuixui/primitives lands",
  ],
  docs: "docs/alert.mdx",
  example: "examples/alert.example.tsx",
  testFile: "src/behaviour/alert.test.tsx",
} as const;
