/**
 * HotkeyRecorder behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a captured chord with the wrong modifiers, Escape that
 * commits, a clear control that also starts recording, blur that leaves the
 * recorder listening, and a disabled recorder that can be activated.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { useState } from "react";
import { HotkeyRecorder } from "../hotkey-recorder.js";
import { clickCentreOf, focusedTestId } from "../internal/interaction.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";

/** A caller-owned chord. */
const Harness = ({
  initial = null,
  disabled = false,
  onChange,
}: {
  readonly initial?: string | null;
  readonly disabled?: boolean;
  readonly onChange?: (value: string | null) => void;
}) => {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <HotkeyRecorder
        testId="recorder"
        label="Toggle command palette"
        value={value}
        disabled={disabled}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
      />
      <div testId="elsewhere" tabIndex={0} style={{ height: 20 }}>
        Elsewhere
      </div>
    </div>
  );
};

describe("HotkeyRecorder", () => {
  it("shows the formatted chord, or the placeholder when unset", () => {
    const empty = renderComponent(<Harness />);
    expect(empty.renderer.getAllText()).toEqual([
      "Click to record",
      "Elsewhere",
    ]);
    empty.unmount();

    const bound = renderComponent(<Harness initial="ctrl+k" />);
    expect(bound.renderer.getAllText()).toEqual(["⌃", "K", "Elsewhere"]);
    expect(bound.renderer.findByText("⌃")?.parentId).toBeDefined();
    bound.unmount();
  });

  it("records a chord after a click", () => {
    const onChange = vi.fn();
    const recorder = renderComponent(<Harness onChange={onChange} />);

    clickCentreOf(recorder, "recorder");
    expect(recorder.renderer.getAllText()).toContain("Press keys…");

    recorder.renderer.simulateKeystrokes("ctrl-shift-k");

    expect(onChange).toHaveBeenCalledWith("Control+Shift+K");
    expect(recorder.renderer.getAllText()).toContain("⌃");

    recorder.unmount();
  });

  it("cancels on Escape without changing the value", () => {
    const onChange = vi.fn();
    const recorder = renderComponent(
      <Harness initial="ctrl+k" onChange={onChange} />,
    );

    clickCentreOf(recorder, "recorder");
    recorder.renderer.simulateKeystrokes("escape");

    expect(onChange).not.toHaveBeenCalled();
    expect(recorder.renderer.getAllText()).toContain("⌃");
    expect(recorder.renderer.getAllText()).not.toContain("Press keys…");

    recorder.unmount();
  });

  it("clears through the clear control without starting a recording", () => {
    const onChange = vi.fn();
    const recorder = renderComponent(
      <Harness initial="ctrl+k" onChange={onChange} />,
    );

    clickCentreOf(recorder, "recorder-clear");

    expect(onChange).toHaveBeenCalledWith(null);
    expect(recorder.renderer.getAllText()).toContain("Click to record");
    expect(recorder.renderer.getAllText()).not.toContain("Press keys…");

    recorder.unmount();
  });

  it("ignores a modifier-only press and keeps recording", () => {
    const onChange = vi.fn();
    const recorder = renderComponent(<Harness onChange={onChange} />);

    clickCentreOf(recorder, "recorder");
    recorder.renderer.focusElement(
      recorder.renderer.findByTestId("recorder")?.id ?? -1,
    );
    recorder.renderer.nativeSimulateKeyDown(
      recorder.renderer.findByTestId("recorder")?.id ?? -1,
      "shift",
    );

    expect(onChange).not.toHaveBeenCalled();
    expect(recorder.renderer.getAllText()).toContain("Press keys…");

    recorder.unmount();
  });

  it("cancels recording when focus leaves", () => {
    const onChange = vi.fn();
    const recorder = renderComponent(<Harness onChange={onChange} />);

    clickCentreOf(recorder, "recorder");
    recorder.renderer.focusElement(
      recorder.renderer.findByTestId("elsewhere")?.id ?? -1,
    );

    expect(onChange).not.toHaveBeenCalled();
    expect(recorder.renderer.getAllText()).not.toContain("Press keys…");

    recorder.unmount();
  });

  it("is out of the tab order and inert when disabled", () => {
    const recorder = renderComponent(<Harness initial="ctrl+k" disabled />);

    expect(
      recorder.renderer.findByTestId("recorder")?.customProps?.tabIndex,
    ).toBe(-1);
    clickCentreOf(recorder, "recorder");
    expect(recorder.renderer.getAllText()).not.toContain("Press keys…");
    expect(recorder.renderer.findByTestId("recorder-clear")).toBeUndefined();

    recorder.unmount();
  });

  it("paints the border and focus state from the theme", () => {
    const recorder = renderComponent(<Harness />);
    recorder.renderer.focusElement(
      recorder.renderer.findByTestId("recorder")?.id ?? -1,
    );
    expect(focusedTestId(recorder)).toEqual(Option.some("recorder"));
    expect(recorder.renderer.findByTestId("recorder")?.style.borderColor).toBe(
      darkTheme.colors.border,
    );
    recorder.unmount();

    const light = renderComponent(<Harness />, "light");
    expect(light.renderer.findByTestId("recorder")?.style.borderColor).toBe(
      lightTheme.colors.border,
    );
    light.unmount();
  });
});
