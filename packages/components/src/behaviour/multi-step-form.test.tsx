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

  it("moves past a step whose stored gate is not a function", () => {
    const wizard = renderComponent(
      <MultiStepForm
        testId="wizard"
        onSubmit={() => undefined}
        steps={[
          {
            id: "name",
            title: "Name",
            // @ts-expect-error — the gate a store wrote where it carried none.
            gate: null,
            content: <text testId="step-one">Name step</text>,
          },
          {
            id: "review",
            title: "Review",
            content: <text testId="step-two">Review step</text>,
          },
        ]}
      />,
    );
    clickCentreOf(wizard, "multi-step-next");
    const painted = text(wizard);
    wizard.unmount();
    expect(painted).toContain("Review step");
    expect(painted).not.toContain("Name step");
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

    expect(painted).toStrictEqual(["Before"]);
  });

  it("reads a stored wizard name and action labels that are not text", () => {
    const wizard = renderComponent(
      <MultiStepForm
        testId="wizard"
        // @ts-expect-error — the names a saved workflow definition wrote.
        label={42}
        // @ts-expect-error — the names a saved workflow definition wrote.
        submitLabel={42}
        // @ts-expect-error — the names a saved workflow definition wrote.
        nextLabel={{ text: "Next" }}
        // @ts-expect-error — the names a saved workflow definition wrote.
        backLabel={42}
        onSubmit={() => undefined}
        steps={[
          {
            id: "name",
            title: "Name",
            content: <text testId="step-one">Name step</text>,
          },
          {
            id: "review",
            title: "Review",
            content: <text testId="step-two">Review step</text>,
          },
        ]}
      />,
    );
    try {
      expect(
        nodesWithRole(wizard.renderer, "list").map((node) => node.name),
      ).toStrictEqual(["Steps"]);
      expect(
        nodesWithRole(wizard.renderer, "button").map((node) => node.name),
      ).toEqual(expect.arrayContaining(["Back", "Next"]));
    } finally {
      wizard.unmount();
    }
  });

  it("names a step whose stored title is not text by its position", () => {
    const wizard = renderComponent(
      <MultiStepForm
        testId="wizard"
        label="Workspace setup"
        onSubmit={() => undefined}
        steps={[
          {
            id: "name",
            // @ts-expect-error — the title a stored workflow wrote.
            title: 42,
            // @ts-expect-error — the description a stored workflow wrote.
            description: { text: "A workspace name" },
            content: <text testId="step-one">Name step</text>,
          },
          {
            id: "review",
            title: "Review",
            content: <text testId="step-two">Review step</text>,
          },
        ]}
      />,
    );
    const lines = text(wizard);
    const groups = nodesWithRole(wizard.renderer, "group").map(
      (node) => node.name,
    );
    wizard.unmount();

    expect(lines).toContain("Step 1");
    expect(lines).toContain("Name step");
    expect(groups).toContain("Step 1, step 1 of 2");
  });

  it("keeps the steps beside a stored entry that names none", () => {
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
