/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { accessibleName, visibleCopy } from "@gpuixui/primitives/core";
import {
  cn,
  STEPPER_DESCRIPTION,
  STEPPER_LABEL,
  STEPPER_MARKER,
  STEPPER_MARKER_TEXT,
  STEPPER_ORIENTATION,
  STEPPER_ROOT,
  STEPPER_STEP,
  STEPPER_TEXT,
} from "@gpuixui/tw";
import { Match } from "effect";
import { createContext, useContext } from "react";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { recipeStyle } from "./internal/recipe.js";
import { textOf } from "./internal/text.js";
import { controlHeight, useTheme, type Theme } from "./internal/theme.js";
import {
  currentStep,
  orientationOf,
  statusOf,
  stepName,
  type StepperOrientation,
  type StepperStatus,
} from "./stepper/logic.js";

export type { StepperStatus } from "./stepper/logic.js";

export type { StepperOrientation } from "./stepper/logic.js";

interface StepperContextValue {
  readonly value: number;
  readonly orientation: StepperOrientation;
}

const StepperContext = createContext<StepperContextValue | undefined>(
  undefined,
);

const useStepper = (): StepperContextValue => {
  const value = useContext(StepperContext);
  if (value === undefined) {
    throw new Error("Stepper parts must be used inside Stepper");
  }
  return value;
};

const markerPalette = (
  theme: Theme,
  status: StepperStatus,
): { readonly backgroundColor: string; readonly color: string } =>
  Match.value(status).pipe(
    Match.when("complete", () => ({
      backgroundColor: theme.colors.secondary,
      color: theme.colors.secondaryForeground,
    })),
    Match.when("current", () => ({
      backgroundColor: theme.colors.primary,
      color: theme.colors.primaryForeground,
    })),
    Match.when("upcoming", () => ({
      backgroundColor: theme.colors.muted,
      color: theme.colors.mutedForeground,
    })),
    Match.exhaustive,
  );

export interface StepperProps extends Omit<Props, "children"> {
  readonly value: number;

  readonly orientation?: StepperOrientation;

  readonly label?: string;
  readonly className?: string;
  readonly children?: PartChildren;
}

export const Stepper = ({
  value,
  orientation: requestedOrientation = "horizontal",
  label,
  className,
  children,
  style,
  ...rest
}: StepperProps) => {
  const theme = useTheme();

  const orientation = orientationOf(requestedOrientation);

  const name = accessibleName(textOf(label));
  assertParts(stepperRoot, children);

  return (
    <StepperContext.Provider value={{ value: currentStep(value), orientation }}>
      <div
        role="list"
        {...(name === undefined ? {} : { "aria-label": name })}
        {...rest}
        style={mergeStyles(
          recipeStyle(
            cn(STEPPER_ROOT, STEPPER_ORIENTATION[orientation], className),
            theme,
          ),
          style,
        )}
      >
        {children}
      </div>
    </StepperContext.Provider>
  );
};

export interface StepperStepProps extends Omit<Props, "children" | "style"> {
  readonly value: number;

  readonly label: string;

  readonly description?: string;

  readonly className?: string;

  readonly style?: StateStyle<StepperStepState>;
}

export interface StepperStepState {
  readonly status: StepperStatus;
}

export const StepperStep = ({
  value,
  label,
  description,
  className,
  style,
  ...rest
}: StepperStepProps) => {
  const theme = useTheme();
  const { value: current } = useStepper();
  const status = statusOf(current, value);
  const marker = markerPalette(theme, status);
  const side = controlHeight(theme, "md");

  const name = stepName(label, value);
  const detail = visibleCopy(textOf(description));

  return (
    <div
      role="listitem"
      aria-label={name}
      aria-selected={status === "current"}
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(STEPPER_STEP, className), theme),
        resolveStyle(style, { status }),
      )}
    >
      <div
        style={mergeStyles(recipeStyle(STEPPER_MARKER, theme), {
          width: side,
          height: side,
          backgroundColor: marker.backgroundColor,
        })}
      >
        <text
          style={mergeStyles(recipeStyle(STEPPER_MARKER_TEXT, theme), {
            color: marker.color,
          })}
        >
          {String(value)}
        </text>
      </div>
      <div style={recipeStyle(STEPPER_TEXT, theme)}>
        <text
          style={mergeStyles(recipeStyle(STEPPER_LABEL, theme), {
            color:
              status === "upcoming"
                ? theme.colors.mutedForeground
                : theme.colors.foreground,
          })}
        >
          {name}
        </text>
        {detail === undefined ? null : (
          <text style={recipeStyle(STEPPER_DESCRIPTION, theme)}>{detail}</text>
        )}
      </div>
    </div>
  );
};

const stepperParts: ReadonlyArray<PartComponent> = [Stepper, StepperStep];

const stepperRoot: PartsContract = {
  parent: "Stepper",
  family: stepperParts,
  accepts: [StepperStep],
  hint: "Put StepperStep directly inside Stepper.",
};

export const stepperMeta = {
  name: "Stepper",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no aria-current in 0.11.0; the current step carries aria-selected",
    "display-only by design: there is no step click, disabled policy or onValueChange",
    "no connector line between steps",
  ],
  docs: "docs/stepper.mdx",
  example: "examples/stepper.example.tsx",
  testFile: "src/behaviour/stepper.test.tsx",
} as const;
