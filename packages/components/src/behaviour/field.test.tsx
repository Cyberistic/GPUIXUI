/**
 * Field behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: an error that left the description visible too; an error
 * announced as ordinary text instead of an alert; a required marker that also
 * polluted the accessible name; an invalid control that kept the neutral border;
 * an invalid focused control that painted no focus ring, so focus was invisible
 * once a field was in error; an input whose typing never reached `onChange`; and
 * a ring that followed React `focus`/`blur` only, so a field focused by code
 * painted none while a seeded ring stayed after focus left (plan 748); and a
 * required field whose description already ended a sentence, announced as
 * `"… design-system.. Required"` because the required sentence was built with a
 * raw template instead of the shared join (plan 804).
 */

import * as Option from "effect/Option";
import { describe, expect, it, vi } from "vitest";
import { darkTheme, focusRing, lightTheme } from "../internal/theme.js";
import { nodesWithRole } from "../internal/a11y.js";
import { focusedTestId, until } from "../internal/interaction.js";
import { renderComponent, type TestTheme } from "../internal/test-root.js";
import { Field, FieldInput } from "../field.js";

/** One email field, with the message slots driven by props. */
const Form = ({
  error,
  required,
  onChange,
}: {
  readonly error?: string;
  readonly required?: boolean;
  readonly onChange?: (value: string) => void;
}) => (
  <Field
    label="Email"
    description="We never share it"
    error={error}
    required={required}
    style={{ width: 320, padding: 40 }}
  >
    <FieldInput
      testId="email"
      onChange={(event) => onChange?.(event.value ?? "")}
    />
  </Field>
);

describe("Field", () => {
  it("renders the label, description and control", () => {
    const form = renderComponent(<Form />);

    expect(form.renderer.getAllText()).toEqual(["Email", "We never share it"]);
    expect(form.renderer.findByTestId("email")?.customProps).toMatchObject({
      "aria-label": "Email",
      "aria-description": "We never share it",
    });

    form.unmount();
  });

  it("replaces the description with the error and announces it", () => {
    const form = renderComponent(<Form error="Enter a valid email" />);

    const texts = form.renderer.getAllText();
    expect(texts).toContain("Enter a valid email");
    expect(texts).not.toContain("We never share it");

    const alerts = nodesWithRole(form.renderer, "alert");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.name).toContain("Enter a valid email");
    expect(form.renderer.findByTestId("email")?.customProps).toMatchObject({
      "aria-description": "Enter a valid email",
    });

    form.unmount();
  });

  it("marks a required field without polluting its accessible name", () => {
    const form = renderComponent(<Form required />);

    expect(form.renderer.getAllText()).toContain("*");
    expect(form.renderer.findByTestId("email")?.customProps).toMatchObject({
      "aria-label": "Email",
      "aria-description": "We never share it. Required",
    });

    form.unmount();
  });

  it("does not double the stop of a description that ends a sentence", () => {
    const form = renderComponent(
      <Field
        label="Slug"
        description="Use a slug, e.g. design-system."
        required
        style={{ width: 320, padding: 40 }}
      >
        <FieldInput testId="slug" />
      </Field>,
    );

    expect(form.renderer.getAllText()).toContain(
      "Use a slug, e.g. design-system.",
    );
    expect(form.renderer.findByTestId("slug")?.customProps).toMatchObject({
      "aria-description": "Use a slug, e.g. design-system. Required",
    });

    form.unmount();
  });

  it("paints an invalid control with the destructive role in both themes", () => {
    const assertTheme = (theme: TestTheme, destructive: string): void => {
      const form = renderComponent(<Form error="Required" />, theme);

      expect(form.renderer.findByTestId("email")?.style.borderColor).toBe(
        destructive,
      );

      form.unmount();
    };

    assertTheme("dark", darkTheme.colors.destructive);
    assertTheme("light", lightTheme.colors.destructive);
  });

  it("reports typed text through onChange", () => {
    const onChange = vi.fn();
    const form = renderComponent(<Form onChange={onChange} />);
    form.renderer.focusElement(form.renderer.findByTestId("email")?.id ?? -1);

    form.renderer.simulateKeystrokes("a");
    form.renderer.simulateKeystrokes("b");

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)).toEqual(["ab"]);

    form.unmount();
  });

  it("leaves the tab order and accepts no typing when disabled", () => {
    const onChange = vi.fn();
    const form = renderComponent(
      <Field label="Email">
        <FieldInput
          testId="email"
          disabled
          onChange={(event) => onChange?.(event.value ?? "")}
        />
      </Field>,
    );
    const input = form.renderer.findByTestId("email");

    expect(input?.customProps?.readOnly).toBe(true);
    expect(input?.customProps?.tabIndex).toBe(-1);

    form.renderer.focusElement(input?.id ?? -1);
    form.renderer.simulateKeystrokes("a");

    expect(onChange).not.toHaveBeenCalled();

    form.unmount();
  });

  it("keeps the focus ring on an invalid control in both themes", () => {
    const assertTheme = (theme: TestTheme): void => {
      const palette = theme === "dark" ? darkTheme : lightTheme;
      const form = renderComponent(
        <Field label="Email" error="Enter a valid email">
          <FieldInput testId="email" autoFocus />
        </Field>,
        theme,
      );

      const input = form.renderer.findByTestId("email");
      expect(input?.style.borderColor).toBe(palette.colors.destructive);
      expect(input?.style.boxShadow).toEqual(focusRing(palette).boxShadow);

      form.unmount();
    };

    assertTheme("dark");
    assertTheme("light");
  });

  it("paints no ring on an invalid control that does not hold focus", () => {
    const form = renderComponent(<Form error="Enter a valid email" />, "light");
    const input = form.renderer.findByTestId("email");

    expect(input?.style.borderColor).toBe(lightTheme.colors.destructive);
    expect(input?.style.boxShadow).toBeUndefined();

    form.unmount();
  });

  it("reflects autoFocus in its focus state", () => {
    // The runtime focuses `autoFocus` after React's effects, so `onFocus` never
    // runs; the public `focused` state must still be true (plan 388).
    const states: Array<boolean> = [];
    const form = renderComponent(
      <Field label="Email">
        <FieldInput
          testId="email"
          autoFocus
          style={(state) => {
            states.push(state.focused);
            return {};
          }}
        />
      </Field>,
    );

    expect(focusedTestId(form)).toEqual(Option.some("email"));
    expect(states.at(-1)).toBe(true);
    expect(form.renderer.findByTestId("email")?.style.boxShadow).toBeDefined();

    form.unmount();
  });

  /**
   * The bug this guards (plan 748): the ring followed React `focus`/`blur` only,
   * and 0.10.0 delivers neither for a native focus move — so a field reached by
   * `Tab` or `focusElement` held focus and painted no ring.
   */
  it("paints the token ring on a field focused by code", async () => {
    const form = renderComponent(
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Field label="Email">
          <FieldInput testId="email" />
        </Field>
        <Field label="Other">
          <FieldInput testId="other" />
        </Field>
      </div>,
      "light",
    );

    form.renderer.focusElement(form.renderer.findByTestId("email")?.id ?? -1);

    await until(
      () => form.renderer.findByTestId("email")?.style.boxShadow !== undefined,
    );

    expect(focusedTestId(form)).toEqual(Option.some("email"));
    expect(form.renderer.findByTestId("email")?.style.boxShadow).toEqual(
      focusRing(lightTheme).boxShadow,
    );

    form.unmount();
  });

  /**
   * The bug this guards (plan 748): the same missing signal in the other
   * direction — a seeded ring never cleared, because no `blur` arrives, so two
   * fields could look focused at once.
   */
  it("clears the seeded ring when native focus leaves, and reports it", async () => {
    const states: Array<boolean> = [];
    const form = renderComponent(
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Field label="Email">
          <FieldInput
            testId="email"
            autoFocus
            style={(state) => {
              states.push(state.focused);
              return {};
            }}
          />
        </Field>
        <Field label="Other">
          <FieldInput testId="other" />
        </Field>
      </div>,
      "light",
    );

    expect(form.renderer.findByTestId("email")?.style.boxShadow).toEqual(
      focusRing(lightTheme).boxShadow,
    );
    expect(states.at(-1)).toBe(true);

    form.renderer.focusNext(); // email -> other, with no React focus event

    await until(
      () => form.renderer.findByTestId("email")?.style.boxShadow === undefined,
    );

    expect(focusedTestId(form)).toEqual(Option.some("other"));
    expect(states.at(-1)).toBe(false);

    form.unmount();
  });

  /** The pin for the disabled branch: the seed and the sample never ring it. */
  it("paints no ring on a disabled field, even when seeded", async () => {
    const form = renderComponent(
      <div>
        <Field label="Email">
          <FieldInput testId="email" disabled autoFocus />
        </Field>
        <div testId="elsewhere" tabIndex={0} style={{ height: 20 }} />
      </div>,
      "light",
    );

    expect(
      form.renderer.findByTestId("email")?.style.boxShadow,
    ).toBeUndefined();

    form.renderer.focusElement(
      form.renderer.findByTestId("elsewhere")?.id ?? -1,
    );

    await until(() => Option.isSome(focusedTestId(form)));

    expect(focusedTestId(form)).toEqual(Option.some("elsewhere"));
    expect(
      form.renderer.findByTestId("email")?.style.boxShadow,
    ).toBeUndefined();

    form.unmount();
  });
});
