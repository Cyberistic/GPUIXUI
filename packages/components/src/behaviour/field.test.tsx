/**
 * Field behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: an error that left the description visible too; an error
 * announced as ordinary text instead of an alert; an error painted in the solid
 * `destructive` fill role, which no contrast pair measures as page text; a
 * required marker that also polluted the accessible name; an invalid control
 * that kept the neutral border; and an input whose typing never reached
 * `onChange`.
 */

import { describe, expect, it, vi } from "vitest";
import { darkTheme, lightTheme } from "../internal/theme.js";
import { nodesWithRole } from "../internal/a11y.js";
import { renderComponent, type TestTheme } from "../internal/test-root.js";
import { Field, FieldError, FieldInput } from "../field.js";

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

  it("paints the required marker in the status tone's measured page role", () => {
    const assertTheme = (name: TestTheme, theme: typeof darkTheme): void => {
      const form = renderComponent(<Form required />, name);
      const leaf = form.renderer.findByText("*");
      const painted =
        leaf?.parentId == null
          ? undefined
          : form.renderer.getElement(leaf.parentId)?.style.color;

      expect(painted).toBe(theme.colors.destructiveSoftForeground);
      expect(painted).not.toBe(theme.colors.destructive);

      form.unmount();
    };

    assertTheme("dark", darkTheme);
    assertTheme("light", lightTheme);
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

  it("paints the error text in the status tone's measured page role", () => {
    const assertTheme = (name: TestTheme, theme: typeof darkTheme): void => {
      const root = renderComponent(
        <FieldError testId="error">Required</FieldError>,
        name,
      );
      const painted = root.renderer.findByTestId("error")?.style.color;

      expect(painted).toBe(theme.colors.destructiveSoftForeground);
      expect(painted).not.toBe(theme.colors.destructive);

      root.unmount();
    };

    assertTheme("dark", darkTheme);
    assertTheme("light", lightTheme);
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
});
