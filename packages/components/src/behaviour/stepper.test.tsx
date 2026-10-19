/**
 * Stepper behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a status that is passed instead of derived from `value`;
 * an inverted comparison that swaps complete and upcoming; a current step that is
 * never announced; labels that ignore the muted role for upcoming steps; and a
 * `style` callback that cannot see the derived status.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { darkTheme, lightTheme } from "../internal/theme.js";
import { nodesNamed, nodesWithRole } from "../internal/a11y.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import { Stepper, StepperStep } from "../stepper.js";

/** Three steps with the current one driven by props. */
const Checkout = ({ value }: { readonly value: number }) => (
  <Stepper value={value} label="Checkout" testId="stepper">
    <StepperStep value={1} label="Account" description="Email and password" />
    <StepperStep value={2} label="Billing" description="Card and address" />
    <StepperStep value={3} label="Review" />
  </Stepper>
);

/** The host element that carries a text node's style. */
const styledText = (root: ComponentTestRoot, value: string) => {
  const leaf = root.renderer.findByText(value);
  if (leaf?.parentId == null) return undefined;
  return root.renderer.getElement(leaf.parentId);
};

/** The marker box behind a step's number. */
const marker = (root: ComponentTestRoot, step: number) => {
  const text = styledText(root, String(step));
  if (text?.parentId == null) return undefined;
  return root.renderer.getElement(text.parentId);
};

/** The first description among the nodes named `name`, or `None`. */
const descriptionOf = (
  root: ComponentTestRoot,
  name: string,
): Option.Option<string> =>
  Option.firstSomeOf(
    Arr.map(nodesNamed(root.renderer, name), (node) => node.description),
  );

describe("Stepper", () => {
  it("renders every step in declaration order with its label and description", () => {
    const stepper = renderComponent(<Checkout value={2} />);

    expect(stepper.renderer.getAllText()).toEqual([
      "1",
      "Account",
      "Email and password",
      "2",
      "Billing",
      "Card and address",
      "3",
      "Review",
    ]);

    stepper.unmount();
  });

  it("derives complete, current and upcoming from the value", () => {
    const stepper = renderComponent(<Checkout value={2} />);

    expect(marker(stepper, 1)?.style.backgroundColor).toBe(
      darkTheme.colors.secondary,
    );
    expect(marker(stepper, 2)?.style.backgroundColor).toBe(
      darkTheme.colors.primary,
    );
    expect(marker(stepper, 3)?.style.backgroundColor).toBe(
      darkTheme.colors.muted,
    );

    stepper.unmount();

    const light = renderComponent(<Checkout value={2} />, "light");
    expect(marker(light, 2)?.style.backgroundColor).toBe(
      lightTheme.colors.primary,
    );
    light.unmount();
  });

  it("marks exactly the current step as selected", () => {
    const stepper = renderComponent(<Checkout value={2} />);

    const rows = nodesWithRole(stepper.renderer, "listitem");
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => Option.contains(row.selected, true))).toEqual([
      false,
      true,
      false,
    ]);

    stepper.unmount();
  });

  it("announces complete, current and upcoming on the rows", () => {
    const stepper = renderComponent(<Checkout value={2} />);

    const rows = nodesWithRole(stepper.renderer, "listitem");
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => Option.getOrUndefined(row.description))).toEqual([
      "Complete",
      "Current",
      "Upcoming",
    ]);

    stepper.unmount();
  });

  it("keeps a caller's description and appends the status", () => {
    const stepper = renderComponent(
      <Stepper value={2} label="Checkout">
        <StepperStep
          value={1}
          label="Account"
          description="Email and password"
          aria-description="Use your work email"
        />
        <StepperStep value={2} label="Billing" />
      </Stepper>,
    );

    expect(descriptionOf(stepper, "Account")).toEqual(
      Option.some("Use your work email. Complete"),
    );
    expect(descriptionOf(stepper, "Billing")).toEqual(Option.some("Current"));

    stepper.unmount();
  });

  it("keeps current and complete labels in the foreground, upcoming muted", () => {
    const stepper = renderComponent(<Checkout value={2} />);

    expect(styledText(stepper, "Account")?.style.color).toBe(
      darkTheme.colors.foreground,
    );
    expect(styledText(stepper, "Billing")?.style.color).toBe(
      darkTheme.colors.foreground,
    );
    expect(styledText(stepper, "Review")?.style.color).toBe(
      darkTheme.colors.mutedForeground,
    );

    stepper.unmount();
  });

  it("lays horizontal steps in a row and vertical steps in a column", () => {
    const horizontal = renderComponent(<Checkout value={1} />);
    expect(
      horizontal.renderer.findByTestId("stepper")?.style.flexDirection,
    ).toBe("row");
    horizontal.unmount();

    const vertical = renderComponent(
      <Stepper value={1} testId="stepper" orientation="vertical">
        <StepperStep value={1} label="Account" />
      </Stepper>,
    );
    expect(vertical.renderer.findByTestId("stepper")?.style.flexDirection).toBe(
      "column",
    );
    vertical.unmount();
  });

  it("names the list and reports list and listitem roles", () => {
    const stepper = renderComponent(<Checkout value={1} />);

    const lists = nodesWithRole(stepper.renderer, "list");
    expect(lists).toHaveLength(1);
    expect(lists[0]?.name).toBe("Checkout");

    stepper.unmount();
  });

  it("lets a consumer's style win over the status rule", () => {
    const stepper = renderComponent(
      <Stepper value={1} label="Checkout">
        <StepperStep
          testId="step"
          value={1}
          label="Account"
          style={{ gap: 99 }}
        />
      </Stepper>,
    );

    expect(stepper.renderer.findByTestId("step")?.style.gap).toBe(99);

    stepper.unmount();
  });

  it("hands the derived status to a style callback", () => {
    const stepper = renderComponent(
      <Stepper value={2} label="Checkout">
        <StepperStep
          testId="one"
          value={1}
          label="Account"
          style={(state) => ({
            opacity: state.status === "current" ? 1 : 0.4,
          })}
        />
        <StepperStep
          testId="two"
          value={2}
          label="Billing"
          style={(state) => ({
            opacity: state.status === "current" ? 1 : 0.4,
          })}
        />
        <StepperStep
          testId="three"
          value={3}
          label="Review"
          style={(state) => ({
            opacity: state.status === "current" ? 1 : 0.4,
          })}
        />
      </Stepper>,
    );

    expect(stepper.renderer.findByTestId("one")?.style.opacity).toBe(0.4);
    expect(stepper.renderer.findByTestId("two")?.style.opacity).toBe(1);
    expect(stepper.renderer.findByTestId("three")?.style.opacity).toBe(0.4);

    stepper.unmount();
  });
});
