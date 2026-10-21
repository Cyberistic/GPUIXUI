/**
 * Form behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a submit that calls the consumer with an invalid value;
 * messages that are not shown, or shown one blob instead of one per issue; a
 * pending form that submits again; a raw value reaching `onSubmit` instead of the
 * decoded one; and a summary that ignores the destructive role.
 */

import { describe, expect, it, vi } from "vitest";
import { Effect } from "effect";
import * as Schema from "effect/Schema";
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

  it("revalidates on an edit after a failed submit, and clears when fixed", () => {
    const onSubmit = vi.fn();
    const form = renderComponent(
      <Harness value={invalid} onSubmit={onSubmit} />,
    );

    clickCentreOf(form, "submit");
    expect(form.renderer.getAllText()).toEqual(
      expect.arrayContaining([...expectedMessages]),
    );

    const partial = { email: "nope", name: "Ada" };
    const partialMessages = Effect.runSync(validateAll(Signup)(partial));
    const dropped = expectedMessages.filter(
      (message) => !partialMessages.includes(message),
    );
    form.rerender(<Harness value={partial} onSubmit={onSubmit} />);

    expect(partialMessages.length).toBeGreaterThan(0);
    expect(form.renderer.getAllText()).toEqual(
      expect.arrayContaining([...partialMessages]),
    );
    expect(dropped).toHaveLength(1);
    expect(form.renderer.getAllText()).not.toContain(dropped[0]);

    form.rerender(<Harness value={valid} onSubmit={onSubmit} />);

    expect(nodesWithRole(form.renderer, "alert")).toHaveLength(0);
    expect(form.renderer.getAllText()).toContain("0:false");
    expect(onSubmit).not.toHaveBeenCalled();

    form.unmount();
  });

  it("shows nothing before the first submit, however the value changes", () => {
    const form = renderComponent(
      <Harness value={invalid} onSubmit={() => undefined} />,
    );

    form.rerender(
      <Harness
        value={{ email: "still-wrong", name: "Ada" }}
        onSubmit={() => undefined}
      />,
    );

    expect(nodesWithRole(form.renderer, "alert")).toHaveLength(0);
    expect(form.renderer.getAllText()).toContain("0:false");

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
