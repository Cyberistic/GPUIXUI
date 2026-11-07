/** @jsxImportSource @gpuix/react */
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
  messageSelection,
  targetSize,
  tone,
  toneOf,
  useTheme,
} from "./internal/theme.js";

export type AlertTone = "info" | "success" | "warning" | "danger";

interface AlertContextValue {
  readonly tone: AlertTone;

  readonly foreground: string;
}

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

const useAlert = (): AlertContextValue => {
  const value = useContext(AlertContext);
  if (value === undefined) {
    throw new Error("Alert parts must be used inside Alert");
  }
  return value;
};

export interface AlertProps extends Omit<Props, "children"> {
  readonly tone?: AlertTone;
  readonly className?: string;
  readonly children?: PartChildren;
}

export const Alert = ({
  tone: requestedTone = "info",
  className,
  children,
  style,
  ...rest
}: AlertProps) => {
  const theme = useTheme();
  const value = toneOf(requestedTone);
  const { fg } = tone(theme, value);
  assertParts(alertRoot, children);

  return (
    <AlertContext.Provider value={{ tone: value, foreground: fg }}>
      <div
        role="alert"
        {...rest}
        style={mergeStyles(
          mergeStyles(
            recipeStyle(cn(ALERT_BASE, ALERT_TONES[value], className), theme),

            { selectionColor: messageSelection(theme, value) },
          ),
          style,
        )}
      >
        {children}
      </div>
    </AlertContext.Provider>
  );
};

export interface AlertIconProps extends Props {
  readonly className?: string;
}

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

export interface AlertContentProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: PartChildren;
}

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

export interface AlertTitleProps extends Props {
  readonly className?: string;
}

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

export interface AlertDescriptionProps extends Props {
  readonly className?: string;
}

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

export interface AlertDismissProps extends Omit<Props, "children"> {
  readonly onDismiss: () => void;

  readonly label?: string;
}

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

export interface AlertLinkProps extends Props {
  readonly onSelect?: () => void;
  readonly className?: string;
}

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
  accepts: [AlertTitle, AlertDescription, AlertLink],
  hint: "Put AlertTitle, AlertDescription and AlertLink directly inside AlertContent.",
};

export const alertMeta = {
  name: "Alerts",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "a message that appears is not announced by a live region: 0.11.0 has no aria-live, so only the root's alert role reaches assistive technology",
  ],
  docs: "docs/alert.mdx",
  example: "examples/alert.example.tsx",
  testFile: "src/behaviour/alert.test.tsx",
} as const;
