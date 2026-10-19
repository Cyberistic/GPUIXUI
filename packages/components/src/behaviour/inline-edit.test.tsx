/**
 * InlineEdit behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a swap that leaves focus outside the input; Enter that
 * commits twice (keyDown and submit); Escape that commits the draft; an
 * unchanged draft that still calls `onCommit`; a disabled control that opens;
 * a controlled edit state the component overrides; Space starting the edit
 * on key down instead of on release; an edit that stays open when the user
 * leaves the field, because a live window does not deliver React's `onBlur` for
 * a native focus change (plans 379/605, guarded by the focused-host sample in
 * plan 613); a disabled display that painted a ring from `autoFocus` and a hover
 * fill (plan 394); and an Escape that cancelled the edit and closed the dialog
 * around it (plan 514).
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "../dialog.js";
import { InlineEdit, type InlineEditProps } from "../inline-edit.js";
import {
  finishMotion,
  clickCentreOf,
  focusedTestId,
  requireBounds,
} from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";

/** A caller-owned value with a sibling focus target for the blur test. */
const Harness = ({
  initial = "",
  onCommit,
  disabled = false,
  host,
}: {
  readonly initial?: string;
  readonly onCommit?: (value: string) => void;
  readonly disabled?: boolean;
  readonly host?: Partial<InlineEditProps>;
}) => {
  const [value, setValue] = useState(initial);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <InlineEdit
        {...host}
        testId="name"
        label="Workspace name"
        value={value}
        disabled={disabled}
        placeholder="Untitled"
        onCommit={(next) => {
          setValue(next);
          onCommit?.(next);
        }}
      />
      <div testId="elsewhere" tabIndex={0} style={{ height: 20 }}>
        Elsewhere
      </div>
      <div testId="backdrop" style={{ height: 120, width: 600 }} />
    </div>
  );
};

/** Enter edit mode by clicking the display. */
const startEditing = (root: ComponentTestRoot): void => {
  clickCentreOf(root, "name");
};

/** A rename control inside an open dialog. */
const InDialog = () => {
  const [open, setOpen] = useState(true);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent label="Settings" testId="dialog">
        <DialogTitle>Settings</DialogTitle>
        <Harness initial="Docs" />
      </DialogContent>
    </Dialog>
  );
};

/** Type every character as a real key press on whatever has focus. */
const type = (root: ComponentTestRoot, text: string): void => {
  text.split("").forEach((key) => root.renderer.simulateKeystrokes(key));
};

describe("InlineEdit", () => {
  it("renders the value in display mode and no input", () => {
    const edit = renderComponent(<Harness initial="Docs" />);

    expect(edit.renderer.getAllText()).toEqual(["Docs", "Elsewhere"]);
    expect(edit.renderer.findByType("input")).toHaveLength(0);

    edit.unmount();
  });

  it("swaps to a focused input on click", () => {
    const edit = renderComponent(<Harness initial="Docs" />);

    startEditing(edit);

    expect(edit.renderer.findByType("input")).toHaveLength(1);
    expect(focusedTestId(edit)).toEqual(Option.some("name"));

    edit.unmount();
  });

  it("enters edit mode from the keyboard", () => {
    const edit = renderComponent(<Harness initial="Docs" />);

    edit.renderer.focusElement(edit.renderer.findByTestId("name")?.id ?? -1);
    edit.renderer.simulateKeystrokes("enter");

    expect(edit.renderer.findByType("input")).toHaveLength(1);

    edit.unmount();
  });

  it("starts editing on Space release, not on press", () => {
    const edit = renderComponent(<Harness initial="Docs" />);
    const display = edit.renderer.findByTestId("name");
    expect(display).toBeDefined();
    if (display === undefined) return;

    edit.renderer.nativeSimulateKeyDown(display.id, "space");
    expect(edit.renderer.findByType("input")).toHaveLength(0);

    edit.renderer.nativeSimulateKeyUp(display.id, "space");
    expect(edit.renderer.findByType("input")).toHaveLength(1);
    expect(focusedTestId(edit)).toEqual(Option.some("name"));

    edit.unmount();
  });

  it("commits a changed draft on Enter and returns focus to the display", () => {
    const onCommit = vi.fn();
    const edit = renderComponent(<Harness onCommit={onCommit} />);

    startEditing(edit);
    type(edit, "docs");
    edit.renderer.simulateKeystrokes("enter");

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("docs");
    expect(edit.renderer.getAllText()).toEqual(["docs", "Elsewhere"]);
    expect(focusedTestId(edit)).toEqual(Option.some("name"));

    edit.unmount();
  });

  it("discards the draft on Escape", () => {
    const onCommit = vi.fn();
    const edit = renderComponent(<Harness initial="old" onCommit={onCommit} />);

    startEditing(edit);
    type(edit, "!");
    edit.renderer.simulateKeystrokes("escape");

    expect(onCommit).not.toHaveBeenCalled();
    expect(edit.renderer.getAllText()).toEqual(["old", "Elsewhere"]);
    expect(focusedTestId(edit)).toEqual(Option.some("name"));

    edit.unmount();
  });

  it("keeps a dialog open for the Escape that cancels the edit", () => {
    // Before plan 514 the cancel and the dialog close both ran on one Escape.
    const nested = renderComponent(<InDialog />);
    startEditing(nested);
    expect(nested.renderer.findByType("input")).toHaveLength(1);

    nested.renderer.simulateKeystrokes("escape");

    expect(nested.renderer.findByType("input")).toHaveLength(0);
    expect(nested.renderer.findByTestId("dialog")).toBeDefined();

    nested.renderer.simulateKeystrokes("escape");
    finishMotion(nested);
    expect(nested.renderer.findByTestId("dialog")).toBeUndefined();

    nested.unmount();
  });

  it("commits a changed draft on blur", () => {
    const onCommit = vi.fn();
    const edit = renderComponent(<Harness onCommit={onCommit} />);

    startEditing(edit);
    type(edit, "blurred");
    edit.renderer.focusElement(
      edit.renderer.findByTestId("elsewhere")?.id ?? -1,
    );

    expect(onCommit).toHaveBeenCalledWith("blurred");

    edit.unmount();
  });

  // Plan 605's live gate: a real window moved native focus away without running
  // React's `onBlur`, so the editor stayed open. `focusNext` reproduces that
  // state headlessly (measured: focus moves, no focus/blur event). Without the
  // focused-host sample the input is still mounted and `onCommit` is uncalled.
  it("commits when native focus leaves without a blur event", async () => {
    const onCommit = vi.fn();
    const edit = renderComponent(<Harness onCommit={onCommit} />);

    startEditing(edit);
    type(edit, "silent");
    edit.renderer.focusNext();

    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("silent");
    expect(edit.renderer.findByType("input")).toHaveLength(0);
    expect(focusedTestId(edit)).toEqual(Option.some("elsewhere"));

    edit.unmount();
  });

  // The sampler runs while the input keeps focus: it must not close an edit
  // that never moved away, and the draft is untouched.
  it("does not commit an edit that keeps focus", async () => {
    const onCommit = vi.fn();
    const edit = renderComponent(
      <Harness onCommit={onCommit} host={{ defaultEditing: true }} />,
    );

    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(onCommit).not.toHaveBeenCalled();
    expect(edit.renderer.findByType("input")).toHaveLength(1);

    edit.unmount();
  });

  it("commits when a press lands outside the field", () => {
    const onCommit = vi.fn();
    const onMouseDownOutside = vi.fn();
    const edit = renderComponent(
      <Harness onCommit={onCommit} host={{ onMouseDownOutside }} />,
    );

    startEditing(edit);
    type(edit, "outside");

    const backdrop = requireBounds(edit, "backdrop");
    const x = backdrop.x + backdrop.width / 2;
    const y = backdrop.y + backdrop.height / 2;
    edit.renderer.nativeSimulateMouseDown(x, y);
    edit.renderer.nativeSimulateMouseUp(x, y);

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("outside");
    expect(onMouseDownOutside).toHaveBeenCalled();
    expect(edit.renderer.findByType("input")).toHaveLength(0);
    expect(focusedTestId(edit)).toEqual(Option.some("name"));

    // A press on another focusable control keeps focus there: the commit must
    // not pull it back to the display.
    startEditing(edit);
    type(edit, "!");
    clickCentreOf(edit, "elsewhere");

    expect(onCommit).toHaveBeenLastCalledWith("outside!");
    expect(focusedTestId(edit)).toEqual(Option.some("elsewhere"));

    edit.unmount();
  });

  it("commits on Tab so a keyboard exit closes the editor", () => {
    const onCommit = vi.fn();
    const edit = renderComponent(<Harness onCommit={onCommit} />);

    startEditing(edit);
    type(edit, "tabbed");
    edit.renderer.simulateKeystrokes("tab");

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("tabbed");
    expect(edit.renderer.findByType("input")).toHaveLength(0);

    edit.unmount();
  });

  it("does not commit when the press is inside the field", () => {
    const onCommit = vi.fn();
    const edit = renderComponent(<Harness onCommit={onCommit} />);

    startEditing(edit);
    type(edit, "inside");

    const bounds = requireBounds(edit, "name");
    edit.renderer.nativeSimulateMouseDown(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    edit.renderer.nativeSimulateMouseUp(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );

    expect(onCommit).not.toHaveBeenCalled();
    expect(edit.renderer.findByType("input")).toHaveLength(1);

    edit.unmount();
  });

  it("does not commit an unchanged draft, and ignores a disabled control", () => {
    const onCommit = vi.fn();
    const edit = renderComponent(<Harness onCommit={onCommit} />);

    startEditing(edit);
    edit.renderer.simulateKeystrokes("enter");

    expect(onCommit).not.toHaveBeenCalled();
    edit.unmount();

    const disabled = renderComponent(<Harness disabled />);
    clickCentreOf(disabled, "name");
    expect(disabled.renderer.findByType("input")).toHaveLength(0);
    disabled.unmount();
  });

  it("follows a controlled edit state", () => {
    const onEditingChange = vi.fn();

    const Controlled = () => {
      const [editing, setEditing] = useState(false);
      return (
        <InlineEdit
          testId="name"
          label="Workspace name"
          value="Docs"
          editing={editing}
          onEditingChange={(next) => {
            setEditing(next);
            onEditingChange(next);
          }}
          onCommit={() => undefined}
        />
      );
    };

    const edit = renderComponent(<Controlled />);
    clickCentreOf(edit, "name");

    expect(onEditingChange).toHaveBeenCalledWith(true);
    expect(edit.renderer.findByType("input")).toHaveLength(1);

    edit.unmount();
  });

  it("composes the caller's display handlers", () => {
    const onClick = vi.fn();
    const onKeyDown = vi.fn();

    const clicked = renderComponent(
      <Harness initial="Docs" host={{ onClick, onKeyDown }} />,
    );
    clickCentreOf(clicked, "name");

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(clicked.renderer.findByType("input")).toHaveLength(1);
    clicked.unmount();

    const keyed = renderComponent(
      <Harness initial="Docs" host={{ onClick, onKeyDown }} />,
    );
    keyed.renderer.focusElement(keyed.renderer.findByTestId("name")?.id ?? -1);
    keyed.renderer.simulateKeystrokes("enter");

    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(keyed.renderer.findByType("input")).toHaveLength(1);
    keyed.unmount();
  });

  it("composes the caller's field handlers", () => {
    const onChange = vi.fn();
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const onSubmit = vi.fn();
    const onCommit = vi.fn();
    const edit = renderComponent(
      <Harness
        onCommit={onCommit}
        host={{ onChange, onFocus, onBlur, onSubmit }}
      />,
    );

    startEditing(edit);
    expect(onFocus).toHaveBeenCalled();
    onBlur.mockClear();

    type(edit, "ok");
    expect(onChange).toHaveBeenCalled();

    edit.renderer.focusElement(
      edit.renderer.findByTestId("elsewhere")?.id ?? -1,
    );
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("ok");

    clickCentreOf(edit, "name");
    type(edit, "!");
    edit.renderer.simulateKeystrokes("enter");

    expect(onSubmit).toHaveBeenCalled();
    expect(onCommit).toHaveBeenLastCalledWith("ok!");

    edit.unmount();
  });

  it("reflects autoFocus in its focus state", () => {
    // The runtime focuses `autoFocus` after React's effects, so `onFocus` never
    // runs; the display's ring must still be painted (plan 388).
    const edit = renderComponent(<Harness host={{ autoFocus: true }} />);

    expect(focusedTestId(edit)).toEqual(Option.some("name"));
    expect(edit.renderer.findByTestId("name")?.style.boxShadow).toBeDefined();

    edit.unmount();
  });

  it("paints no ring and no hover while disabled", () => {
    // `autoFocus` on a disabled control could never be honoured, so seeding the
    // focus state from the prop painted a ring on a control that cannot take
    // focus; the hover fill had the same problem (plan 394).
    const edit = renderComponent(
      <Harness disabled host={{ autoFocus: true }} />,
    );

    const display = edit.renderer.findByTestId("name");

    expect(focusedTestId(edit)).toEqual(Option.none());
    expect(display?.style.boxShadow).toBeUndefined();
    expect(display?.style.hover).toBeUndefined();
    expect(display?.customProps?.tabIndex).toBe(-1);

    edit.unmount();
  });
});
