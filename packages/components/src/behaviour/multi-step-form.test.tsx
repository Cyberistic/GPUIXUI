/**
 * Multi-step form behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: advancing without validating the current step; showing a
 * failing step's message on the next one; a `back` that traps the user on an
 * invalid step; `submit` firing before the last step (or submitting the raw
 * draft); `pending` still moving the workflow; a controlled `step` that moves
 * itself; an out-of-range controlled index crashing the render.
 *
 * Runs wherever GPUix publishes a native binding; on this Intel Mac that is plan
 * 140's locally built `darwin-x64` binding.
 */

import { describe, expect, it, vi } from "vitest";
import { Effect } from "effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { nodesWithRole } from "../internal/a11y.js";
import { Button } from "../internal/button.js";
import { clickCentreOf } from "../internal/interaction.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
  type TestTheme,
} from "../internal/test-root.js";
import { MultiStepForm, type MultiStepFormStep } from "../multi-step-form.js";
import { validateAll } from "../validation/logic.js";

const addressMessage = "Enter an address with an @";

const Address = Schema.String.check(
  Schema.makeFilter((value: string) => value.includes("@"), {
    identifier: "AddressHasAtCheck",
    title: "Address has @",
    description: "An address that contains `@`.",
    message: addressMessage,
  }),
);

const AccountFields = Schema.Struct({ email: Address });
const BillingFields = Schema.Struct({ card: Schema.NonEmptyString });

class Checkout extends Schema.Class<Checkout>("Checkout")({
  email: Address,
  card: Schema.NonEmptyString,
}) {}

const steps = [
  { id: "account", label: "Account", schema: AccountFields },
  { id: "billing", label: "Billing", schema: BillingFields },
] as const satisfies readonly [MultiStepFormStep, ...MultiStepFormStep[]];

const valid = { email: "ada@example.com", card: "4242" };

/** A workflow whose visible state is the index, the flags and the messages. */
const Harness = ({
  value,
  pending = false,
  onSubmit = () => undefined,
  step,
  defaultStep,
  onStepChange,
}: {
  readonly value: unknown;
  readonly pending?: boolean;
  readonly onSubmit?: (value: Checkout) => void;
  readonly step?: number;
  readonly defaultStep?: number;
  readonly onStepChange?: (index: number) => void;
}) => (
  <MultiStepForm
    schema={Checkout}
    value={value}
    steps={steps}
    onSubmit={onSubmit}
    pending={pending}
    step={step}
    defaultStep={defaultStep}
    onStepChange={onStepChange}
    label="Checkout"
    testId="form"
  >
    {(form) => (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <text testId="state">
          {`${form.index}:${form.isFirst}:${form.isLast}:${form.pending}`}
        </text>
        <text testId="step">{form.step.id}</text>
        <text testId="errors">{`${form.errors.length}:${form.errors.join("|")}`}</text>
        <text testId="email-error">
          {`email:${form.errorFor("email") ?? "none"}`}
        </text>
        <Button testId="next" onClick={form.next}>
          Next
        </Button>
        <Button testId="back" onClick={form.back}>
          Back
        </Button>
        <Button testId="submit" onClick={form.submit}>
          Submit
        </Button>
      </div>
    )}
  </MultiStepForm>
);

/** The styled text element a message is painted as. */
const styledMessage = (root: ComponentTestRoot, message: string) => {
  const leaf = root.renderer.findByText(message);
  if (leaf?.parentId == null) return undefined;
  return root.renderer.getElement(leaf.parentId);
};

describe("Multi-step form", () => {
  it("renders the first step, its flags and the stepper's current step", () => {
    const form = renderComponent(
      <Harness value={valid} onSubmit={() => undefined} />,
    );

    expect(form.renderer.getAllText()).toEqual(
      expect.arrayContaining(["0:true:false:false", "account"]),
    );

    const items = nodesWithRole(form.renderer, "listitem");
    expect(items.map((item) => item.name)).toEqual(["Account", "Billing"]);
    expect(
      Option.getOrElse(items[0]?.selected ?? Option.none(), () => false),
    ).toBe(true);
    expect(
      Option.getOrElse(items[1]?.selected ?? Option.none(), () => false),
    ).toBe(false);

    form.unmount();
  });

  it("next on an invalid step shows its message and does not move", () => {
    const onStepChange = vi.fn();
    const assertTheme = (theme: TestTheme, destructive: string): void => {
      const form = renderComponent(
        <Harness
          value={{ email: "nope", card: "4242" }}
          onStepChange={onStepChange}
        />,
        theme,
      );

      clickCentreOf(form, "next");

      expect(onStepChange).not.toHaveBeenCalled();
      expect(form.renderer.getAllText()).toEqual(
        expect.arrayContaining([
          "0:true:false:false",
          `email:${addressMessage}`,
        ]),
      );
      expect(styledMessage(form, addressMessage)?.style.color).toBe(
        destructive,
      );

      form.unmount();
    };

    assertTheme("dark", darkTheme.colors.destructive);
    assertTheme("light", lightTheme.colors.destructive);
  });

  it("next on a valid step advances once and clears the message", () => {
    const onStepChange = vi.fn();
    const form = renderComponent(
      <Harness
        value={{ email: "nope", card: "4242" }}
        onStepChange={onStepChange}
      />,
    );

    clickCentreOf(form, "next");
    expect(form.renderer.getAllText()).toContain(`1:${addressMessage}`);

    form.rerender(<Harness value={valid} onStepChange={onStepChange} />);
    clickCentreOf(form, "next");

    expect(onStepChange).toHaveBeenCalledTimes(1);
    expect(onStepChange).toHaveBeenCalledWith(1);
    expect(form.renderer.getAllText()).toEqual(
      expect.arrayContaining(["1:false:true:false", "billing", "0:"]),
    );

    form.unmount();
  });

  it("back leaves a failing step without validating it", () => {
    const onStepChange = vi.fn();
    const form = renderComponent(
      <Harness
        value={{ email: "ada@example.com", card: "" }}
        defaultStep={1}
        onStepChange={onStepChange}
      />,
    );

    clickCentreOf(form, "next");
    expect(form.renderer.getAllText()).toContain("1:false:true:false");

    clickCentreOf(form, "back");

    expect(onStepChange).toHaveBeenCalledTimes(1);
    expect(onStepChange).toHaveBeenCalledWith(0);
    expect(form.renderer.getAllText()).toEqual(
      expect.arrayContaining(["0:true:false:false", "account", "0:"]),
    );

    form.unmount();
  });

  it("submit on the last step delivers the decoded value", () => {
    const assertTheme = (theme: TestTheme): void => {
      const onSubmit = vi.fn();
      const form = renderComponent(
        <Harness value={valid} defaultStep={1} onSubmit={onSubmit} />,
        theme,
      );

      clickCentreOf(form, "submit");

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit.mock.calls[0]?.[0]).toBeInstanceOf(Checkout);
      expect(onSubmit.mock.calls[0]?.[0]).toMatchObject(valid);

      form.unmount();
    };

    assertTheme("dark");
    assertTheme("light");
  });

  it("an invalid last step shows every message and never submits", () => {
    const onSubmit = vi.fn();
    const expected = Effect.runSync(
      validateAll(Checkout)({ email: "nope", card: "" }),
    );
    const form = renderComponent(
      <Harness
        value={{ email: "nope", card: "" }}
        defaultStep={1}
        onSubmit={onSubmit}
      />,
    );

    clickCentreOf(form, "submit");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(form.renderer.getAllText()).toEqual(
      expect.arrayContaining(["1:false:true:false", ...expected]),
    );

    form.unmount();
  });

  it("submit before the last step is a no-op", () => {
    const onSubmit = vi.fn();
    const form = renderComponent(<Harness value={valid} onSubmit={onSubmit} />);

    clickCentreOf(form, "submit");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(form.renderer.getAllText()).toContain("0:true:false:false");

    form.unmount();
  });

  it("pending locks next, back and submit", () => {
    const onStepChange = vi.fn();
    const first = renderComponent(
      <Harness value={valid} pending onStepChange={onStepChange} />,
    );

    clickCentreOf(first, "next");

    expect(onStepChange).not.toHaveBeenCalled();
    expect(first.renderer.getAllText()).toContain("0:true:false:true");
    first.unmount();

    const onSubmit = vi.fn();
    const last = renderComponent(
      <Harness
        value={valid}
        defaultStep={1}
        pending
        onSubmit={onSubmit}
        onStepChange={onStepChange}
      />,
    );

    clickCentreOf(last, "back");
    clickCentreOf(last, "submit");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onStepChange).not.toHaveBeenCalled();
    expect(last.renderer.getAllText()).toContain("1:false:true:true");

    last.unmount();
  });

  it("a controlled step is authoritative", () => {
    const onStepChange = vi.fn();
    const form = renderComponent(
      <Harness value={valid} step={0} onStepChange={onStepChange} />,
    );

    clickCentreOf(form, "next");

    expect(onStepChange).toHaveBeenCalledWith(1);
    expect(form.renderer.getAllText()).toContain("0:true:false:false");

    form.rerender(
      <Harness value={valid} step={1} onStepChange={onStepChange} />,
    );

    expect(form.renderer.getAllText()).toEqual(
      expect.arrayContaining(["1:false:true:false", "billing"]),
    );

    form.unmount();
  });

  it("clamps a controlled index outside the range", () => {
    const form = renderComponent(<Harness value={valid} step={99} />);

    expect(form.renderer.getAllText()).toEqual(
      expect.arrayContaining(["1:false:true:false", "billing"]),
    );

    form.rerender(<Harness value={valid} step={-5} />);

    expect(form.renderer.getAllText()).toEqual(
      expect.arrayContaining(["0:true:false:false", "account"]),
    );

    form.unmount();
  });

  it("a controlled move does not paint the previous step's message", () => {
    const form = renderComponent(
      <Harness value={{ email: "nope", card: "4242" }} step={0} />,
    );

    clickCentreOf(form, "next");
    expect(form.renderer.getAllText()).toContain(addressMessage);

    form.rerender(<Harness value={{ email: "nope", card: "4242" }} step={1} />);

    expect(form.renderer.getAllText()).not.toContain(addressMessage);

    form.unmount();
  });

  it("renders one alert with one text node per distinct message", () => {
    const expected = Effect.runSync(
      validateAll(Checkout)({ email: "nope", card: "" }),
    );
    const form = renderComponent(
      <Harness value={{ email: "nope", card: "" }} defaultStep={1} />,
    );

    clickCentreOf(form, "submit");

    const alerts = nodesWithRole(form.renderer, "alert");
    expect(alerts).toHaveLength(1);

    const messages = form.renderer
      .getAllText()
      .filter((text) => expected.includes(text));
    expect(messages).toEqual(expected);

    form.unmount();
  });
});
