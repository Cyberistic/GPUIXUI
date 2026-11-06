/** @jsxImportSource @gpuix/react */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import { Button } from "../src/internal/button.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../src/card.js";
import { PageTransition } from "../src/page-transition.js";
import type { PageDirection } from "../src/page-transition/logic.js";

interface Step {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly rows: ReadonlyArray<readonly [string, string]>;
}

const steps: ReadonlyArray<Step> = [
  {
    id: "details",
    title: "Workspace details",
    description: "The name your team sees and the region its data lives in.",
    rows: [
      ["Name", "Acme Design"],
      ["Region", "eu-west-1"],
      ["Owner", "ada@example.com"],
    ],
  },
  {
    id: "plan",
    title: "Plan",
    description: "Seats are billed monthly and can change at any time.",
    rows: [
      ["Plan", "Team"],
      ["Seats", "12"],
      ["Billing", "Monthly"],
    ],
  },
  {
    id: "review",
    title: "Review",
    description: "Check the details above before the workspace is created.",
    rows: [
      ["Name", "Acme Design"],
      ["Plan", "Team · 12 seats"],
      ["Region", "eu-west-1"],
    ],
  },
];

const stepIndex = (id: string): number =>
  Option.getOrElse(
    Arr.findFirstIndex(steps, (step) => step.id === id),
    () => 0,
  );

const stepAt = (index: number): Option.Option<Step> => Arr.get(steps, index);

const StepBody = ({ step }: { readonly step: Step }) => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.md,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "bodyStrong"),
          color: theme.colors.cardForeground,
        }}
      >
        {step.title}
      </text>
      <text
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.mutedForeground,
        }}
      >
        {step.description}
      </text>
      {Arr.map(step.rows, ([label, value]) => (
        <div
          key={label}
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            gap: theme.spacing.md,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.mutedForeground,
            }}
          >
            {label}
          </text>
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.cardForeground,
            }}
          >
            {value}
          </text>
        </div>
      ))}
    </div>
  );
};

export const PageTransitionExample = () => {
  const theme = useTheme();
  const [step, setStep] = useState(steps[0]?.id ?? "details");
  const [direction, setDirection] = useState<PageDirection>("forward");

  const index = stepIndex(step);
  const current = stepAt(index);
  const last = index === Arr.length(steps) - 1;

  const go = (to: number): void => {
    Option.match(stepAt(to), {
      onNone: () => undefined,
      onSome: (next) => {
        setDirection(to > index ? "forward" : "back");
        setStep(next.id);
      },
    });
  };

  return (
    <Card testId="page-transition-example" style={{ width: 420 }}>
      <CardHeader>
        <CardTitle>New workspace</CardTitle>
        <CardDescription>
          Step {index + 1} of {steps.length}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PageTransition
          testId="wizard-page"
          viewKey={step}
          direction={direction}
        >
          {Option.match(current, {
            onNone: () => null,
            onSome: (shown) => <StepBody step={shown} />,
          })}
        </PageTransition>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            gap: theme.spacing.sm,
            paddingTop: theme.spacing.md,
          }}
        >
          <Button
            variant="secondary"
            disabled={index === 0}
            onClick={() => go(index - 1)}
          >
            Back
          </Button>
          <Button onClick={() => go(index + 1)} disabled={last}>
            {last ? "Create workspace" : "Continue"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
