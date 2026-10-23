/**
 * MultiStepForm behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a gate that is checked after the step moves instead of
 * before; a wizard that paints another step's content under the current one; a
 * submit reachable before the last step; a refusal that survives the step it
 * belongs to; a pending wizard that advances or submits again; and a controlled
 * `step` that does not drive the paint.
 */

import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { nodesWithRole } from "../internal/a11y.js";
import { Button } from "../internal/button.js";
import { clickCentreOf } from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import { MultiStepForm } from "../multi-step-form.js";

interface HarnessProps {
  readonly onSubmit?: () => void;
  readonly pending?: boolean;
  readonly step?: number;
  readonly onStepChange?: (step: number) => void;
  readonly defaultStep?: number;
  readonly acceptGate?: () => boolean;
}

/** Two steps: the first is released by a press, the second by its own press. */
const Harness = ({
  onSubmit = () => undefined,
  pending = false,
  step,
  onStepChange,
  defaultStep,
  acceptGate,
}: HarnessProps) => {
  const [ready, setReady] = useState(false);
  const [accepted, setAccepted] = useState(false);
  return (
    <MultiStepForm
      testId="wizard"
      label="Workspace setup"
      pending={pending}
      step={step}
      defaultStep={defaultStep}
      onStepChange={onStepChange}
      onSubmit={onSubmit}
      steps={[
        {
          id: "name",
          title: "Name",
          description: "A workspace name",
          gate: () =>
            ready ? Option.none() : Option.some("Enter a workspace name"),
          content: (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <text testId="step-one">Name step</text>
              <Button testId="make-ready" onClick={() => setReady(true)}>
                Fill the name
              </Button>
            </div>
          ),
        },
        {
          id: "review",
          title: "Review",
          gate: () => {
            if (acceptGate?.() === false) return Option.some("Accept first");
            return accepted
              ? Option.none()
              : Option.some("Accept the checklist before creating");
          },
          content: (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <text testId="step-two">Review step</text>
              <Button testId="accept" onClick={() => setAccepted(true)}>
                Accept
              </Button>
            </div>
          ),
        },
      ]}
    />
  );
};

const text = (root: ComponentTestRoot): ReadonlyArray<string> =>
  root.renderer.getAllText();

const selectedSteps = (root: ComponentTestRoot): ReadonlyArray<boolean> =>
  nodesWithRole(root.renderer, "listitem").map((row) =>
    Option.contains(row.selected, true),
  );

const stepOne = (root: ComponentTestRoot): boolean =>
  text(root).includes("Name step");

describe("MultiStepForm", () => {
  it("paints the indicator and only the current step's content", () => {
    const wizard = renderComponent(<Harness />);
    const lines = text(wizard);
    expect(lines).toContain("Name");
    expect(lines).toContain("Review");
    expect(lines).toContain("Name step");
    expect(lines).not.toContain("Review step");
    expect(
      Option.isSome(
        Option.fromNullishOr(wizard.renderer.findByTestId("multi-step-next")),
      ),
    ).toBe(true);
    expect(
      Option.isNone(
        Option.fromNullishOr(wizard.renderer.findByTestId("multi-step-submit")),
      ),
    ).toBe(true);
    wizard.unmount();
  });

  it("keeps the reader on a step whose gate refuses, and shows why", () => {
    const wizard = renderComponent(<Harness />);
    clickCentreOf(wizard, "multi-step-next");
    expect(text(wizard)).toContain("Enter a workspace name");
    expect(stepOne(wizard)).toBe(true);
    expect(selectedSteps(wizard)).toStrictEqual([true, false]);
    wizard.unmount();
  });

  it("advances when the gate allows, and moves the selected marker", () => {
    const wizard = renderComponent(<Harness />);
    clickCentreOf(wizard, "make-ready");
    clickCentreOf(wizard, "multi-step-next");
    expect(text(wizard)).toContain("Review step");
    expect(text(wizard)).not.toContain("Name step");
    expect(text(wizard)).not.toContain("Enter a workspace name");
    expect(selectedSteps(wizard)).toStrictEqual([false, true]);
    expect(
      Option.isSome(
        Option.fromNullishOr(wizard.renderer.findByTestId("multi-step-submit")),
      ),
    ).toBe(true);
    expect(
      Option.isNone(
        Option.fromNullishOr(wizard.renderer.findByTestId("multi-step-next")),
      ),
    ).toBe(true);
    wizard.unmount();
  });

  it("goes back, clears a refusal, and refuses to go back from the first step", () => {
    const wizard = renderComponent(<Harness />);
    clickCentreOf(wizard, "make-ready");
    clickCentreOf(wizard, "multi-step-next");
    clickCentreOf(wizard, "multi-step-back");
    expect(stepOne(wizard)).toBe(true);
    clickCentreOf(wizard, "multi-step-back");
    expect(stepOne(wizard)).toBe(true);
    expect(selectedSteps(wizard)).toStrictEqual([true, false]);
    wizard.unmount();
  });

  it("submits only from the last step, once its gate allows", () => {
    const onSubmit = vi.fn();
    const wizard = renderComponent(<Harness onSubmit={onSubmit} />);
    clickCentreOf(wizard, "make-ready");
    clickCentreOf(wizard, "multi-step-next");
    clickCentreOf(wizard, "multi-step-submit");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(text(wizard)).toContain("Accept the checklist before creating");
    clickCentreOf(wizard, "accept");
    clickCentreOf(wizard, "multi-step-submit");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    wizard.unmount();
  });

  it("refuses to advance or submit while the caller is pending", () => {
    const onSubmit = vi.fn();
    const wizard = renderComponent(<Harness onSubmit={onSubmit} pending />);
    clickCentreOf(wizard, "multi-step-next");
    expect(text(wizard)).not.toContain("Enter a workspace name");
    expect(stepOne(wizard)).toBe(true);
    wizard.unmount();
  });

  it("lets a controlled step drive the paint and reports a change", () => {
    const onStepChange = vi.fn();
    const wizard = renderComponent(
      <Harness step={2} onStepChange={onStepChange} />,
    );
    expect(text(wizard)).toContain("Review step");
    expect(selectedSteps(wizard)).toStrictEqual([false, true]);
    clickCentreOf(wizard, "multi-step-back");
    expect(onStepChange).toHaveBeenCalledWith(1);
    expect(text(wizard)).toContain("Review step");
    wizard.unmount();
  });

  it("reads a starting step past the end as the last step", () => {
    const wizard = renderComponent(<Harness defaultStep={99} />);
    expect(text(wizard)).toContain("Review step");
    expect(selectedSteps(wizard)).toStrictEqual([false, true]);
    wizard.unmount();
  });
});
