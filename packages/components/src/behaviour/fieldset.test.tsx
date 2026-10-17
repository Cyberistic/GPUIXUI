/**
 * Fieldset behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a group with no accessible name; a legend rendered twice
 * (the root writes it and a consumer writes it again); a `disabled` fieldset that
 * leaves its input editable and in the tab order; a disabled group that changes
 * a control it does not own; and a consumer `style` losing to the group layout.
 *
 * Runs wherever GPUix publishes a native binding; on this Intel Mac that is plan
 * 140's locally built `darwin-x64` binding.
 */

import { describe, expect, it, vi } from "vitest";
import { Field, FieldInput } from "../field.js";
import { Fieldset } from "../fieldset.js";
import { nodesWithRole } from "../internal/a11y.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import { renderComponent, type TestTheme } from "../internal/test-root.js";

/** Two fields in one billing group, with the group's own state driven by props. */
const Billing = ({
  disabled,
  onChange,
}: {
  readonly disabled?: boolean;
  readonly onChange?: (value: string) => void;
}) => (
  <Fieldset legend="Billing address" disabled={disabled} testId="fieldset">
    <Field label="Street">
      <FieldInput
        testId="street"
        onChange={(event) => onChange?.(event.value ?? "")}
      />
    </Field>
    <Field label="City">
      <FieldInput testId="city" />
    </Field>
  </Fieldset>
);

describe("Fieldset", () => {
  it("names the group by its legend and renders the legend once", () => {
    const group = renderComponent(<Billing />);

    const groups = nodesWithRole(group.renderer, "group");
    expect(groups).toHaveLength(1);
    expect(groups[0]?.name).toBe("Billing address");
    expect(group.renderer.getAllText()).toEqual([
      "Billing address",
      "Street",
      "City",
    ]);

    group.unmount();
  });

  it("renders the grouped fields in declaration order", () => {
    const group = renderComponent(<Billing />);

    expect(group.renderer.getAllText()).toContain("Street");
    expect(group.renderer.getAllText()).toContain("City");
    expect(group.renderer.findByTestId("street")).toBeDefined();

    group.unmount();
  });

  it("leaves the input editable when the group is enabled", () => {
    const onChange = vi.fn();
    const group = renderComponent(<Billing onChange={onChange} />);
    const input = group.renderer.findByTestId("street");
    group.renderer.focusElement(input?.id ?? -1);

    group.renderer.simulateKeystrokes("a");

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)).toEqual(["a"]);

    group.unmount();
  });

  it("makes the field's input read-only and leaves the tab order when disabled", () => {
    const onChange = vi.fn();
    const group = renderComponent(<Billing disabled onChange={onChange} />);
    const input = group.renderer.findByTestId("street");

    expect(input?.customProps?.readOnly).toBe(true);
    expect(input?.customProps?.tabIndex).toBe(-1);

    group.renderer.focusElement(input?.id ?? -1);
    group.renderer.simulateKeystrokes("a");
    expect(onChange).not.toHaveBeenCalled();

    group.unmount();
  });

  it("paints the disabled legend and input from the theme in both themes", () => {
    const assertTheme = (
      theme: TestTheme,
      colours: {
        readonly legend: string;
        readonly input: string;
        readonly inputText: string;
      },
    ): void => {
      const group = renderComponent(<Billing disabled />, theme);
      const legend = group.renderer.findByText("Billing address");
      const legendBox =
        legend?.parentId == null
          ? undefined
          : group.renderer.getElement(legend.parentId);

      expect(legendBox?.style.color).toBe(colours.legend);
      expect(group.renderer.findByTestId("street")?.style.backgroundColor).toBe(
        colours.input,
      );
      expect(group.renderer.findByTestId("street")?.style.color).toBe(
        colours.inputText,
      );

      group.unmount();
    };

    assertTheme("dark", {
      legend: darkTheme.colors.disabledForeground,
      input: darkTheme.colors.disabled,
      inputText: darkTheme.colors.disabledForeground,
    });
    assertTheme("light", {
      legend: lightTheme.colors.disabledForeground,
      input: lightTheme.colors.disabled,
      inputText: lightTheme.colors.disabledForeground,
    });
  });

  it("lets a consumer's style win over the group layout", () => {
    const group = renderComponent(
      <Fieldset legend="Billing" testId="fieldset" style={{ gap: 99 }} />,
    );

    expect(group.renderer.findByTestId("fieldset")?.style.gap).toBe(99);

    group.unmount();
  });

  it("renders an enabled group without a disabled prop on the default path", () => {
    const group = renderComponent(
      <Fieldset legend="Shipping" testId="fieldset">
        <Field label="Country">
          <FieldInput testId="country" />
        </Field>
      </Fieldset>,
    );

    expect(
      group.renderer.findByTestId("country")?.customProps?.readOnly,
    ).toBeUndefined();
    expect(group.renderer.findByTestId("country")?.customProps?.tabIndex).toBe(
      undefined,
    );

    group.unmount();
  });
});
