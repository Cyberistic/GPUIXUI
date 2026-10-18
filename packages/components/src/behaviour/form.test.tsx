/**
 * Form behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a submit that calls the consumer with an invalid value;
 * messages that are not shown, or shown one blob instead of one per issue; a
 * pending form that submits again; a raw value reaching `onSubmit` instead of the
 * decoded one; a summary that ignores the destructive role; and a form that knows
 * every message but not which field produced it, so inline validation has to be
 * wired by hand and can drift from the summary.
 */

import { describe, expect, it, vi } from "vitest";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Schema from "effect/Schema";
import { Field, FieldInput } from "../field.js";
import { Form } from "../form.js";
import { nodesWithRole } from "../internal/a11y.js";
import { Button } from "../internal/button.js";
import { clickCentreOf } from "../internal/interaction.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
  type TestTheme,
} from "../internal/test-root.js";
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

class Signup extends Schema.Class<Signup>("Signup")({
  email: Address,
  name: Schema.NonEmptyString,
}) {}

/** A form whose only visible state is a text line and a submit button. */
const Harness = ({
  value,
  pending = false,
  onSubmit,
  style,
}: {
  readonly value: unknown;
  readonly pending?: boolean;
  readonly onSubmit: (value: Signup) => void;
  readonly style?: { readonly gap: number };
}) => (
  <Form
    schema={Signup}
    value={value}
    pending={pending}
    onSubmit={onSubmit}
    label="Create account"
    testId="form"
    style={style}
  >
    {(form) => (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <text testId="state">{`${form.errors.length}:${form.pending}`}</text>
        <Button testId="submit" onClick={form.submit}>
          Create account
        </Button>
      </div>
    )}
  </Form>
);

/** The styled text element a message is painted as. */
const styledMessage = (root: ComponentTestRoot, message: string) => {
  const leaf = root.renderer.findByText(message);
  if (leaf?.parentId == null) return undefined;
  return root.renderer.getElement(leaf.parentId);
};

/** A form whose render prop prints the located errors and wires one Field. */
const LocatedHarness = ({
  value,
  onSubmit,
}: {
  readonly value: unknown;
  readonly onSubmit: (value: Signup) => void;
}) => (
  <Form schema={Signup} value={value} onSubmit={onSubmit}>
    {(state) => (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <Field
          label="Email"
          error={state.errorFor("email")}
          testId="email-field"
        >
          <FieldInput testId="email" value="" onChange={() => undefined} />
        </Field>
        <Field label="Name" error={state.errorFor("name")} testId="name-field">
          <FieldInput testId="name" value="" onChange={() => undefined} />
        </Field>
        <text testId="paths">
          {Arr.join(
            Arr.map(state.fieldErrors, (field) => field.path.join(".")),
            ",",
          )}
        </text>
        <text testId="email-error">
          {`email:${state.errorFor("email") ?? "none"}`}
        </text>
        <text testId="name-error">
          {`name:${state.errorFor(["name"]) ?? "none"}`}
        </text>
        <text testId="missing">
          {`missing:${state.errorFor("missing") ?? "none"}`}
        </text>
        <Button testId="submit" onClick={state.submit}>
          Create account
        </Button>
      </div>
    )}
  </Form>
);

const valid = { email: "ada@example.com", name: "Ada" };
const invalid = { email: "nope", name: "" };

/** The messages the validator produces for `invalid`, in order. */
const expectedMessages = Effect.runSync(validateAll(Signup)(invalid));

describe("Form", () => {
  it("renders the render prop's children with an idle state", () => {
    const form = renderComponent(
      <Harness value={valid} onSubmit={() => undefined} />,
    );

    expect(form.renderer.getAllText()).toContain("0:false");
    expect(form.renderer.findByTestId("submit")).toBeDefined();

    form.unmount();
  });

  it("submits the decoded value when the schema accepts it", () => {
    const onSubmit = vi.fn();
    const form = renderComponent(<Harness value={valid} onSubmit={onSubmit} />);

    clickCentreOf(form, "submit");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toBeInstanceOf(Signup);
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject(valid);

    form.unmount();
  });

  it("shows every message and never submits an invalid value", () => {
    const onSubmit = vi.fn();
    const form = renderComponent(
      <Harness value={invalid} onSubmit={onSubmit} />,
    );

    clickCentreOf(form, "submit");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(form.renderer.getAllText()).toEqual(
      expect.arrayContaining([...expectedMessages]),
    );

    form.unmount();
  });

  it("renders the messages in one alert as separate text nodes", () => {
    const form = renderComponent(
      <Harness value={invalid} onSubmit={() => undefined} />,
    );

    clickCentreOf(form, "submit");

    const alerts = nodesWithRole(form.renderer, "alert");
    expect(alerts).toHaveLength(1);

    const messages = form.renderer
      .getAllText()
      .filter((text) => expectedMessages.includes(text));
    expect(messages).toEqual(expectedMessages);

    form.unmount();
  });

  it("locates each message at the field that produced it", () => {
    const form = renderComponent(
      <LocatedHarness value={invalid} onSubmit={() => undefined} />,
    );

    clickCentreOf(form, "submit");

    const texts = form.renderer.getAllText();
    expect(texts).toContain("email,name");
    expect(texts).toContain(`email:${addressMessage}`);
    expect(texts).toContain(`name:${expectedMessages[1]}`);
    expect(texts).toContain("missing:none");

    form.unmount();
  });

  it("an inline Field paints the located message and the invalid control", () => {
    const form = renderComponent(
      <LocatedHarness value={invalid} onSubmit={() => undefined} />,
    );

    clickCentreOf(form, "submit");

    expect(form.renderer.findByTestId("email")?.style.borderColor).toBe(
      darkTheme.colors.destructive,
    );

    form.unmount();
  });

  it("exposes pending and refuses to submit while pending", () => {
    const onSubmit = vi.fn();
    const form = renderComponent(
      <Harness value={valid} pending onSubmit={onSubmit} />,
    );

    expect(form.renderer.getAllText()).toContain("0:true");

    clickCentreOf(form, "submit");

    expect(onSubmit).not.toHaveBeenCalled();

    form.unmount();
  });

  it("lets a consumer's style win and paints the summary destructively in both themes", () => {
    const assertTheme = (theme: TestTheme, destructive: string): void => {
      const form = renderComponent(
        <Harness
          value={invalid}
          onSubmit={() => undefined}
          style={{ gap: 99 }}
        />,
        theme,
      );

      expect(form.renderer.findByTestId("form")?.style.gap).toBe(99);

      clickCentreOf(form, "submit");
      expect(styledMessage(form, addressMessage)?.style.color).toBe(
        destructive,
      );

      form.unmount();
    };

    assertTheme("dark", darkTheme.colors.destructive);
    assertTheme("light", lightTheme.colors.destructive);
  });

  it("is a named form landmark", () => {
    const form = renderComponent(
      <Harness value={valid} onSubmit={() => undefined} />,
    );

    const landmarks = nodesWithRole(form.renderer, "form");
    expect(landmarks).toHaveLength(1);
    expect(landmarks[0]?.name).toBe("Create account");

    form.unmount();
  });
});
