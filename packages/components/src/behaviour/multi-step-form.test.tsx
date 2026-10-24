/**
 * MultiStepForm behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a gate that is checked after the step moves instead of
 * before; a wizard that paints another step's content under the current one; a
 * submit reachable before the last step; a refusal that survives the step it
 * belongs to (including through a caller's reorder of `steps`); a pending
 * wizard that advances or submits again; a controlled `step` that does not
 * drive the paint; and a gate whose message arrived blank, which left the reader
 * on the step with an empty alert and no reason for the refusal.
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
import { REFUSAL_FALLBACK } from "../wizard/logic.js";

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

/** A wizard whose only gate answers with a blank message. */
const BlankRefusal = () => (
  <MultiStepForm
    testId="wizard"
    onSubmit={() => undefined}
    steps={[
      {
        id: "name",
        title: "Name",
        gate: () => Option.some("   "),
        content: <text testId="step-one">Name step</text>,
      },
      {
        id: "review",
        title: "Review",
        content: <text testId="step-two">Review step</text>,
      },
    ]}
  />
);

/** Two named steps the caller can reorder without changing the current index. */
const Ordered = ({ reordered }: { readonly reordered: boolean }) => {
  const name = {
    id: "name",
    title: "Name",
    gate: () => Option.some("Enter a workspace name"),
    content: <text testId="step-name">Name step</text>,
  };
  const review = {
    id: "review",
    title: "Review",
    content: <text testId="step-review">Review step</text>,
  };
  return (
    <MultiStepForm
      testId="wizard"
      onSubmit={() => undefined}
      steps={reordered ? [review, name] : [name, review]}
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

  it("announces the step's place on the content it mounts", () => {
    // The bug guarded: a roleless div carrying only `aria-label` paints no a11y
    // node, so the step announcement never reached a reader.
    const wizard = renderComponent(<Harness />);
    const groups = nodesWithRole(wizard.renderer, "group").map(
      (node) => node.name,
    );
    expect(groups).toContain("Name, step 1 of 2");
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

  it("paints the shipped sentence when a gate's message says nothing", () => {
    const wizard = renderComponent(<BlankRefusal />);
    clickCentreOf(wizard, "multi-step-next");
    const stillOnTheStep = stepOne(wizard);
    const lines = text(wizard);
    wizard.unmount();
    expect(stillOnTheStep).toBe(true);
    expect(lines).toContain(REFUSAL_FALLBACK);
    expect(lines).not.toContain("   ");
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

  it("keeps a refusal with the step it was raised on when the caller reorders", () => {
    // The bug guarded: a refusal remembered by its index paints on whichever
    // step the caller later moves into that slot.
    const wizard = renderComponent(<Ordered reordered={false} />);
    clickCentreOf(wizard, "multi-step-next");
    expect(text(wizard)).toContain("Enter a workspace name");
    wizard.rerender(<Ordered reordered />);
    expect(text(wizard)).toContain("Review step");
    expect(text(wizard)).not.toContain("Enter a workspace name");
    wizard.unmount();
  });

  it("reads a starting step past the end as the last step", () => {
    const wizard = renderComponent(<Harness defaultStep={99} />);
    expect(text(wizard)).toContain("Review step");
    expect(selectedSteps(wizard)).toStrictEqual([false, true]);
    wizard.unmount();
  });

  it("reads a blank action label as the default, never an unnamed action", () => {
    // The bug guarded: a default applies only to an absent prop, so an i18n
    // table that handed over "" (a missing key) painted the wizard's only
    // forward actions with no words and no accessible name — a blank box the
    // reader had to press to make progress.
    const wizard = renderComponent(
      <MultiStepForm
        testId="wizard"
        label="Workspace setup"
        onSubmit={() => undefined}
        nextLabel="   "
        backLabel="   "
        submitLabel="   "
        steps={[
          {
            id: "one",
            title: "Name",
            content: <text testId="step-one">Name step</text>,
          },
          {
            id: "two",
            title: "Review",
            content: <text testId="step-two">Review step</text>,
          },
        ]}
      />,
    );
    const actions = (): ReadonlyArray<string> =>
      nodesWithRole(wizard.renderer, "button").map((node) => node.name);
    expect(actions()).toStrictEqual(["Back", "Next"]);
    clickCentreOf(wizard, "multi-step-next");
    expect(actions()).toStrictEqual(["Back", "Submit"]);
    wizard.unmount();
  });

  it("names the wizard, its list and its steps when every name arrived blank", () => {
    // The bug guarded: `label`, a step's `title` and its `description` are copy
    // from a data table or an i18n file as often as literals, and a blank one
    // published an empty group name, an unnamed list item and an announcement
    // opening with a comma (", step 1 of 2").
    const wizard = renderComponent(
      <MultiStepForm
        testId="wizard"
        label="   "
        onSubmit={() => undefined}
        steps={[
          {
            id: "one",
            title: "",
            description: "   ",
            content: <text testId="step-one">Name step</text>,
          },
          {
            id: "two",
            title: "  Review  ",
            content: <text testId="step-two">Review step</text>,
          },
        ]}
      />,
    );
    expect(
      nodesWithRole(wizard.renderer, "list").map((node) => node.name),
    ).toStrictEqual(["Steps"]);
    expect(
      nodesWithRole(wizard.renderer, "listitem").map((node) => node.name),
    ).toStrictEqual(["Step 1", "Review"]);
    expect(
      nodesWithRole(wizard.renderer, "group").map((node) => node.name),
    ).toContain("Step 1, step 1 of 2");
    expect(
      wizard.renderer.findByTestId("wizard")?.customProps?.["aria-label"],
    ).toBeUndefined();
    expect(text(wizard)).not.toContain("   ");
    wizard.unmount();
  });

  it("paints a stored step list that is not a list as no workflow", () => {
    // The bug guarded: a workflow is data as often as code — an app composing its
    // wizard from a saved definition — and JSON writes `null` for a list it never
    // carried. `steps.length` threw `Cannot read properties of undefined
    // (reading 'length')` before the first step painted, taking the whole screen
    // with it, where the documented empty list paints nothing.
    const wizard = renderComponent(
      <div>
        <text testId="before">Before</text>
        <MultiStepForm
          testId="wizard"
          // @ts-expect-error — the list a store wrote where it carried none.
          steps={null}
          onSubmit={() => undefined}
        />
      </div>,
    );
    const painted = text(wizard);
    wizard.unmount();
    // The sibling is the counter: a render that threw takes the whole tree with
    // it, so an empty read alone could pass on the crash.
    expect(painted).toStrictEqual(["Before"]);
  });

  it("keeps the steps beside a stored entry that names none", () => {
    // A deleted record leaves `null` inside the list, and an entry whose id is
    // not text has no identity for the indicator's key or the refusal's step:
    // the row threw on its `id` while its neighbours painted. The workflow paints
    // the readable steps and the arithmetic counts them.
    const wizard = renderComponent(
      <MultiStepForm
        testId="wizard"
        label="Workspace setup"
        onSubmit={() => undefined}
        steps={[
          {
            id: "name",
            title: "Name",
            content: <text testId="step-one">Name step</text>,
          },
          // @ts-expect-error — a deleted record a store left in the list.
          null,
          {
            id: "review",
            title: "Review",
            content: <text testId="step-two">Review step</text>,
          },
        ]}
      />,
    );
    const lines = text(wizard);
    const steps = selectedSteps(wizard);
    wizard.unmount();
    expect(lines).toContain("Name");
    expect(lines).toContain("Review");
    expect(lines).toContain("Name step");
    expect(steps).toStrictEqual([true, false]);
  });
});
