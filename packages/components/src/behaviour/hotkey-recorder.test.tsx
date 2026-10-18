/**
 * HotkeyRecorder behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a captured chord with the wrong modifiers, Escape that
 * commits, a clear control that also starts recording, a recording that
 * outlives the field because the runtime delivers no blur, a disabled recorder
 * that can be activated, Space starting
 * a recording on key down instead of on release, a captured Space reopening the
 * recorder on its key-up, a keyboard-cleared value starting one instead, and an
 * Escape that stopped the recording and closed the dialog around it (plan 514).
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "../dialog.js";
import { HotkeyRecorder } from "../hotkey-recorder.js";
import {
  clickCentreOf,
  finishMotion,
  focusedTestId,
} from "../internal/interaction.js";
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

/** A recorder inside an open dialog. */
const InDialog = () => {
  const [open, setOpen] = useState(true);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent label="Settings" testId="dialog">
        <DialogTitle>Settings</DialogTitle>
        <Harness initial="ctrl+k" />
      </DialogContent>
    </Dialog>
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
    expect(bound.renderer.getAllText()).toEqual(["Ctrl", "K", "Elsewhere"]);
    expect(bound.renderer.findByType("svg")).toHaveLength(1);
    expect(bound.renderer.findByText("Ctrl")?.parentId).toBeDefined();
    bound.unmount();
  });

  it("records a chord after a click", () => {
    const onChange = vi.fn();
    const recorder = renderComponent(<Harness onChange={onChange} />);

    clickCentreOf(recorder, "recorder");
    expect(recorder.renderer.getAllText()).toContain("Press keys…");

    recorder.renderer.simulateKeystrokes("ctrl-shift-k");

    expect(onChange).toHaveBeenCalledWith("ctrl+shift+k");
    expect(recorder.renderer.getAllText()).toContain("Ctrl");

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
    expect(recorder.renderer.getAllText()).toContain("Ctrl");
    expect(recorder.renderer.getAllText()).not.toContain("Press keys…");

    recorder.unmount();
  });

  it("keeps a dialog open for the Escape that stops recording", () => {
    // Before plan 514 the recorder stopped and the dialog closed on one Escape.
    const nested = renderComponent(<InDialog />);
    clickCentreOf(nested, "recorder");
    expect(nested.renderer.getAllText()).toContain("Press keys…");

    nested.renderer.simulateKeystrokes("escape");

    expect(nested.renderer.getAllText()).not.toContain("Press keys…");
    expect(nested.renderer.findByTestId("dialog")).toBeDefined();

    nested.renderer.simulateKeystrokes("escape");
    finishMotion(nested);
    expect(nested.renderer.findByTestId("dialog")).toBeUndefined();

    nested.unmount();
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

  it("starts recording on Space release, not on press", () => {
    const recorder = renderComponent(<Harness />);
    const root = recorder.renderer.findByTestId("recorder");
    expect(root).toBeDefined();
    if (root === undefined) return;

    recorder.renderer.nativeSimulateKeyDown(root.id, "space");
    expect(recorder.renderer.getAllText()).not.toContain("Press keys…");

    recorder.renderer.nativeSimulateKeyUp(root.id, "space");
    expect(recorder.renderer.getAllText()).toContain("Press keys…");

    recorder.unmount();
  });

  it("captures Space as a chord without reopening the recorder", () => {
    const onChange = vi.fn();
    const recorder = renderComponent(<Harness onChange={onChange} />);

    clickCentreOf(recorder, "recorder");
    const root = recorder.renderer.findByTestId("recorder");
    expect(root).toBeDefined();
    if (root === undefined) return;

    recorder.renderer.nativeSimulateKeyDown(root.id, "space");
    recorder.renderer.nativeSimulateKeyUp(root.id, "space");

    expect(onChange).toHaveBeenCalledWith("space");
    expect(recorder.renderer.getAllText()).not.toContain("Press keys…");

    recorder.unmount();
  });

  it("clears from the keyboard without starting a recording", () => {
    const onChange = vi.fn();
    const recorder = renderComponent(
      <Harness initial="ctrl+k" onChange={onChange} />,
    );
    const clear = recorder.renderer.findByTestId("recorder-clear");
    expect(clear).toBeDefined();
    if (clear === undefined) return;

    recorder.renderer.nativeSimulateKeyDown(clear.id, "space");
    expect(onChange).not.toHaveBeenCalled();

    recorder.renderer.nativeSimulateKeyUp(clear.id, "space");
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

  it("cancels recording when a press lands outside the field", () => {
    const onChange = vi.fn();
    const recorder = renderComponent(<Harness onChange={onChange} />);

    clickCentreOf(recorder, "recorder");
    expect(recorder.renderer.getAllText()).toContain("Press keys…");

    clickCentreOf(recorder, "elsewhere");

    expect(onChange).not.toHaveBeenCalled();
    expect(recorder.renderer.getAllText()).not.toContain("Press keys…");

    recorder.unmount();
  });

  it("cancels recording on Tab", () => {
    const onChange = vi.fn();
    const recorder = renderComponent(<Harness onChange={onChange} />);

    clickCentreOf(recorder, "recorder");
    expect(recorder.renderer.getAllText()).toContain("Press keys…");

    recorder.renderer.simulateKeystrokes("tab");

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

  it("reflects autoFocus in its focus state", () => {
    // The runtime focuses `autoFocus` after React's effects, so `onFocus` never
    // runs; the recorder's ring must still be painted (plan 388).
    const recorder = renderComponent(
      <HotkeyRecorder
        testId="recorder"
        label="Toggle command palette"
        value={null}
        autoFocus
        onChange={vi.fn()}
      />,
    );

    expect(focusedTestId(recorder)).toEqual(Option.some("recorder"));
    expect(
      recorder.renderer.findByTestId("recorder")?.style.boxShadow,
    ).toBeDefined();

    recorder.unmount();
  });

  /**
   * Focus visibility (plan 522). The bug this guards, measured: the clear
   * control took native focus and painted no ring, so a keyboard user could not
   * see that the next Enter would clear the binding.
   */
  it("paints the focus ring on the clear control", () => {
    const recorder = renderComponent(<Harness initial="ctrl+k" />);

    recorder.renderer.focusElement(
      recorder.renderer.findByTestId("recorder-clear")?.id ?? -1,
    );

    expect(focusedTestId(recorder)).toEqual(Option.some("recorder-clear"));
    expect(
      recorder.renderer.findByTestId("recorder-clear")?.style.boxShadow,
    ).toBeDefined();

    recorder.unmount();
  });
});
