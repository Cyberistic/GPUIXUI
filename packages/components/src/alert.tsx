/**
 * Alert: a persistent, in-flow message about the current context.
 *
 * In-flow, not floating: an alert occupies its place in the layout and stays
 * until the state it describes changes. A message that appears and leaves on its
 * own is a toast; a message that blocks the window is a dialog.
 *
 * Compound parts (`docs/component-api.md` §8): the root owns `role="alert"` and
 * the tone; `AlertIcon`, `AlertContent`, `AlertTitle`, `AlertDescription` and
 * `AlertDismiss` read that tone through a context, so a part is never given a
 * duplicated `tone` prop.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import {
  createContext,
  useContext,
  useLayoutEffect,
  type ReactNode,
} from "react";
import { IconButton } from "./internal/button.js";
import { controlName } from "./internal/name.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { textStyle, tone, toneSurface, useTheme } from "./internal/theme.js";
import { useTextRegistry } from "./internal/text-registry.js";

/** The four status tones an alert can carry. */
export type AlertTone = "info" | "success" | "warning" | "danger";

/** The two parts that can name an alert, in priority order. */
type AlertNameKind = "title" | "description";

interface AlertContextValue {
  /** The root's tone, so a part can paint its own region. */
  readonly tone: AlertTone;
  /** The tone's readable text colour on the soft surface. */
  readonly foreground: string;
  /** Hand a nameable part's plain text to the root. */
  readonly registerText: (kind: AlertNameKind, text: string) => () => void;
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

/**
 * Name the alert from a part's plain text. The root prefers its title and falls
 * back to its description, and an unmount or rename updates the name in place.
 */
const useNameRegistration = (
  kind: AlertNameKind,
  children: ReactNode,
): void => {
  const { registerText } = useAlert();
  const text = controlName(undefined, children);
  useLayoutEffect(
    () => (text === undefined ? undefined : registerText(kind, text)),
    [kind, registerText, text],
  );
};

/** {@link Alert} props. */
export interface AlertProps extends Omit<Props, "children"> {
  /** Default `"info"`. */
  readonly tone?: AlertTone;
  readonly children?: PartChildren;
}

/**
 * The tone-tinted surface and the alert live region.
 * Defaults to `info`, so an unqualified alert reads as neutral information.
 */
export const Alert = ({
  tone: value = "info",
  children,
  style,
  ...rest
}: AlertProps) => {
  const theme = useTheme();
  const { fg } = tone(theme, value);
  const { register, textOf } = useTextRegistry();
  const name = textOf("title") ?? textOf("description");
  assertParts(alertRoot, children);

  return (
    <AlertContext.Provider
      value={{ tone: value, foreground: fg, registerText: register }}
    >
      <div
        role="alert"
        {...(name === undefined ? {} : { "aria-label": name })}
        {...rest}
        style={mergeStyles(
          {
            ...toneSurface(theme, value),
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: theme.spacing.lg,
            padding: theme.spacing.lg,
            borderRadius: theme.radius.md,
          },
          style,
        )}
      >
        {children}
      </div>
    </AlertContext.Provider>
  );
};

/** {@link AlertIcon} props. */
export type AlertIconProps = Props;

/** The leading glyph, painted in the tone's foreground. */
export const AlertIcon = ({ style, ...rest }: AlertIconProps) => {
  const { foreground } = useAlert();

  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          flexShrink: 0,
          color: foreground,
        },
        style,
      )}
    />
  );
};

/** {@link AlertContent} props. */
export interface AlertContentProps extends Omit<Props, "children"> {
  readonly children?: PartChildren;
}

/** The growing column between the glyph and the dismiss control. */
export const AlertContent = ({
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
        {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing["2xs"],
          flexGrow: 1,
        },
        style,
      )}
    >
      {children}
    </div>
  );
};

/** {@link AlertTitle} props. */
export type AlertTitleProps = Props;

/** The heading. It always uses the tone's readable foreground. */
export const AlertTitle = ({ children, style, ...rest }: AlertTitleProps) => {
  const theme = useTheme();
  const { foreground } = useAlert();
  useNameRegistration("title", children);

  return (
    <text
      {...rest}
      style={mergeStyles(
        { ...textStyle(theme, "bodyStrong"), color: foreground },
        style,
      )}
    >
      {children}
    </text>
  );
};

/** {@link AlertDescription} props. */
export type AlertDescriptionProps = Props;

/**
 * Body prose in the page foreground rather than the tone's, because body text
 * has to stay readable on the tint. It is a container, so it may hold an action.
 */
export const AlertDescription = ({
  children,
  style,
  ...rest
}: AlertDescriptionProps) => {
  const theme = useTheme();
  useNameRegistration("description", children);

  return (
    <div
      {...rest}
      style={mergeStyles(
        { ...textStyle(theme, "body"), color: theme.colors.foreground },
        style,
      )}
    >
      {children}
    </div>
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
  testId = "alert-dismiss",
  onClick,
  ...rest
}: AlertDismissProps) => {
  const { foreground } = useAlert();

  return (
    <IconButton
      {...rest}
      size="sm"
      label={label}
      testId={testId}
      onClick={(event) => {
        onClick?.(event);
        onDismiss();
      }}
    >
      <Icon name="x" color={foreground} size="sm" />
    </IconButton>
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
  focusable: true,
  limitations: [
    "the dismiss control is this package's local button: primitives' Button reads a second theme context, so adoption waits on one provider",
  ],
  docs: "docs/alert.mdx",
  example: "examples/alert.example.tsx",
  testFile: "src/behaviour/alert.test.tsx",
} as const;
