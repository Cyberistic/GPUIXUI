/**
 * The controlled-state hook, in the real GPUix renderer (plan 517).
 *
 * The bug these guard: in uncontrolled mode the hook compared the requested
 * value with the (always `undefined`) prop instead of the value it held, so a
 * control reported `onChange` for a request that changed nothing — pressing an
 * already-selected uncontrolled tab fired `onValueChange("profile")`. The
 * controlled path was correct, so the cases below pin both modes and the new
 * comparison must not suppress a real change. The last case pins the shipped
 * precedence rule (plan 685): when a caller supplies both props, `value` wins
 * and `defaultValue` is inert, with no diagnostic.
 */

import { describe, expect, it, vi } from "vitest";
import { clickCentreOf } from "../internal/interaction.js";
import { useControllableState } from "../internal/controllable.js";
import { renderComponent } from "../internal/test-root.js";

/** A tiny control whose readout is the hook's resolved value. */
const Probe = ({
  value,
  defaultValue,
  onChange,
}: {
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onChange?: (next: string) => void;
}) => {
  const [current, set] = useControllableState({
    value,
    defaultValue: defaultValue ?? "alpha",
    onChange,
  });

  return (
    <div testId="root">
      <text testId="readout">{`value:${current}`}</text>
      <div
        role="button"
        tabIndex={0}
        testId="set-alpha"
        onClick={() => set("alpha")}
      >
        set alpha
      </div>
      <div
        role="button"
        tabIndex={0}
        testId="set-beta"
        onClick={() => set("beta")}
      >
        set beta
      </div>
    </div>
  );
};

describe("useControllableState", () => {
  it("does not report a request for the value an uncontrolled control already holds", () => {
    const onChange = vi.fn();
    const probe = renderComponent(<Probe onChange={onChange} />);

    clickCentreOf(probe, "set-alpha");

    expect(onChange).not.toHaveBeenCalled();
    expect(probe.renderer.getAllText()).toContain("value:alpha");

    probe.unmount();
  });

  it("reports and stores a different uncontrolled value", () => {
    const onChange = vi.fn();
    const probe = renderComponent(<Probe onChange={onChange} />);

    clickCentreOf(probe, "set-beta");

    expect(onChange.mock.calls).toEqual([["beta"]]);
    expect(probe.renderer.getAllText()).toContain("value:beta");

    probe.unmount();
  });

  it("stays on the caller's value in controlled mode and reports one real change", () => {
    const onChange = vi.fn();
    const probe = renderComponent(<Probe value="alpha" onChange={onChange} />);

    clickCentreOf(probe, "set-alpha");
    expect(onChange).not.toHaveBeenCalled();
    expect(probe.renderer.getAllText()).toContain("value:alpha");

    clickCentreOf(probe, "set-beta");
    expect(onChange.mock.calls).toEqual([["beta"]]);
    expect(probe.renderer.getAllText()).toContain("value:alpha");

    probe.rerender(<Probe value="beta" onChange={onChange} />);
    expect(probe.renderer.getAllText()).toContain("value:beta");

    probe.unmount();
  });

  it("lets the controlled value win when both props are supplied", () => {
    const onChange = vi.fn();
    const probe = renderComponent(
      <Probe value="alpha" defaultValue="beta" onChange={onChange} />,
    );

    expect(probe.renderer.getAllText()).toContain("value:alpha");

    clickCentreOf(probe, "set-beta");
    expect(onChange.mock.calls).toEqual([["beta"]]);
    expect(probe.renderer.getAllText()).toContain("value:alpha");

    probe.rerender(
      <Probe value="beta" defaultValue="beta" onChange={onChange} />,
    );
    expect(probe.renderer.getAllText()).toContain("value:beta");

    probe.unmount();
  });
});
