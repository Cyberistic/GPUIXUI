/**
 * Stepper: a multi-step progress indicator.
 *
 * The status is derived from `value`, never passed: a step before the current
 * one is complete, the current one is current, the rest are upcoming. The
 * component holds no state and takes no callback — the workflow that owns the
 * value renders the stepper from it, the same way a `Field` does not own its
 * value.
 *
 * Measured limitation: `@gpuix/native@0.10.0` has no `aria-current`, so the
 * current step carries `aria-selected` — the substitution Pagination uses.
 * There is no connector line either: the runtime has no pseudo-elements, and a
 * connector is not one of the two parts the contract fixes.
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Match } from "effect";
import { createContext, useContext } from "react";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { statusDescription } from "./internal/state-description.js";
import {
  controlHeight,
  textStyle,
  useTheme,
  type Theme,
} from "./internal/theme.js";

/** The two axes a stepper can run along. */
export type StepperOrientation = "horizontal" | "vertical";

/** Where a step sits relative to the current one. */
export type StepperStatus = "complete" | "current" | "upcoming";

/** What a step derives from the root. */
interface StepperContextValue {
  readonly value: number;
  readonly orientation: StepperOrientation;
}

const StepperContext = createContext<StepperContextValue | undefined>(
  undefined,
);

/** The stepper a part belongs to. Throws when there is none. */
const useStepper = (): StepperContextValue => {
  const value = useContext(StepperContext);
  if (value === undefined) {
    throw new Error("Stepper parts must be used inside Stepper");
  }
  return value;
};

/** A step's status relative to the current value. One place, one rule. */
const statusOf = (current: number, step: number): StepperStatus =>
  step < current ? "complete" : step === current ? "current" : "upcoming";

/** The marker's fill and text colour for one status. */
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

/** {@link Stepper} props. */
export interface StepperProps extends Omit<Props, "children"> {
  /** The current step, 1-based. Steps below it are complete. */
  readonly value: number;
  /** Default `"horizontal"`. */
  readonly orientation?: StepperOrientation;
  /** The list's accessible name. */
  readonly label?: string;
  readonly children?: PartChildren;
}

/** A read-only step list. The statuses come from `value`. */
export const Stepper = ({
  value,
  orientation = "horizontal",
  label,
  children,
  style,
  ...rest
}: StepperProps) => {
  const theme = useTheme();
  assertParts(stepperRoot, children);

  return (
    <StepperContext.Provider value={{ value, orientation }}>
      <div
        role="list"
        {...(label === undefined ? {} : { "aria-label": label })}
        {...rest}
        style={mergeStyles(
          {
            display: "flex",
            flexDirection: orientation === "horizontal" ? "row" : "column",
            alignItems: orientation === "horizontal" ? "flex-start" : "stretch",
            gap: theme.spacing["2xl"],
          },
          style,
        )}
      >
        {children}
      </div>
    </StepperContext.Provider>
  );
};

/** {@link StepperStep} props. */
export interface StepperStepProps extends Omit<Props, "children" | "style"> {
  /** This step's position, 1-based. Must agree with the root's scale. */
  readonly value: number;
  /** The step's name. */
  readonly label: string;
  /** One line of supporting copy under the name. */
  readonly description?: string;
  /** A style, or a function of the step's derived status. */
  readonly style?: StateStyle<StepperStepState>;
}

/** What a step draws: its derived status. */
export interface StepperStepState {
  readonly status: StepperStatus;
}

/** One numbered step: marker, name and optional description. The row announces
 *  its derived status ("Complete", "Current" or "Upcoming"). */
export const StepperStep = ({
  value,
  label,
  description,
  style,
  "aria-description": authoredDescription,
  ...rest
}: StepperStepProps) => {
  const theme = useTheme();
  const { value: current } = useStepper();
  const status = statusOf(current, value);
  const marker = markerPalette(theme, status);
  const side = controlHeight(theme, "md");

  return (
    <div
      role="listitem"
      aria-label={label}
      aria-selected={status === "current"}
      {...rest}
      {...statusDescription(status, authoredDescription)}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
        },
        resolveStyle(style, { status }),
      )}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          width: side,
          height: side,
          borderRadius: theme.radius.full,
          backgroundColor: marker.backgroundColor,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: marker.color,
          }}
        >
          {String(value)}
        </text>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing["2xs"],
        }}
      >
        <text
          style={{
            ...textStyle(theme, "label"),
            color:
              status === "upcoming"
                ? theme.colors.mutedForeground
                : theme.colors.foreground,
          }}
        >
          {label}
        </text>
        {description === undefined ? null : (
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            {description}
          </text>
        )}
      </div>
    </div>
  );
};

/** Every part of Stepper, so a misplaced sibling is named. */
const stepperParts: ReadonlyArray<PartComponent> = [Stepper, StepperStep];

const stepperRoot: PartsContract = {
  parent: "Stepper",
  family: stepperParts,
  accepts: [StepperStep],
  hint: "Put StepperStep directly inside Stepper.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const stepperMeta = {
  name: "Stepper",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  focusable: false,
  limitations: [
    "no aria-current in 0.10.0; the current step carries aria-selected",
    "display-only by design: there is no step click, disabled policy or onValueChange",
    "no connector line between steps",
  ],
  docs: "docs/stepper.mdx",
  example: "examples/stepper.example.tsx",
  testFile: "src/behaviour/stepper.test.tsx",
} as const;
