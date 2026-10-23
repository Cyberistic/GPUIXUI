/**
 * InlineEdit behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a swap that leaves focus outside the input; Enter that
 * commits twice (keyDown and submit); Escape that commits the draft; an
 * unchanged draft that still calls `onCommit`; a disabled control that opens;
 * a control a caller disables mid-edit that still commits that draft on Enter
 * or blur; a controlled edit state the component overrides; and the caller's
 * own `onChange`, `onBlur` and `onSubmit` handlers, which the editor used to
 * drop because it wrote its own over them.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { useState } from "react";
import { InlineEdit } from "../inline-edit.js";
import { clickCentreOf, focusedTestId } from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";

/** A caller-owned value with a sibling focus target for the blur test. */
const Harness = ({
  initial = "",
  onCommit,
  disabled = false,
}: {
  readonly initial?: string;
  readonly onCommit?: (value: string) => void;
  readonly disabled?: boolean;
}) => {
  const [value, setValue] = useState(initial);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <InlineEdit
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
    </div>
  );
};

/** Enter edit mode by clicking the display. */
const startEditing = (root: ComponentTestRoot): void => {
  clickCentreOf(root, "name");
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

  it("discards a draft the caller disables before it commits", () => {
    const onCommit = vi.fn();
    const edit = renderComponent(<Harness initial="old" onCommit={onCommit} />);

    startEditing(edit);
    type(edit, "new");
    edit.rerender(<Harness initial="old" onCommit={onCommit} disabled />);
    edit.renderer.simulateKeystrokes("enter");

    expect(onCommit).not.toHaveBeenCalled();
    expect(edit.renderer.getAllText()).toEqual(["old", "Elsewhere"]);
    expect(focusedTestId(edit)).toEqual(Option.some("name"));

    edit.unmount();
  });

  it("discards a draft the caller disables before the blur commits it", () => {
    const onCommit = vi.fn();
    const edit = renderComponent(<Harness initial="old" onCommit={onCommit} />);

    startEditing(edit);
    type(edit, "new");
    edit.rerender(<Harness initial="old" onCommit={onCommit} disabled />);
    edit.renderer.focusElement(
      edit.renderer.findByTestId("elsewhere")?.id ?? -1,
    );

    expect(onCommit).not.toHaveBeenCalled();
    expect(edit.renderer.getAllText()).toEqual(["old", "Elsewhere"]);

    edit.unmount();
  });

  it("composes the caller's edit, submit and blur handlers with its own", () => {
    // `InlineEditProps` extends the host input's props, so a caller can pass
    // `onChange`/`onSubmit`/`onBlur`; the editor wrote its own over the spread
    // and the caller's handler ran only on the display, never while editing.
    const onCommit = vi.fn();
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    const onBlur = vi.fn();

    const Handled = () => (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <InlineEdit
          testId="name"
          label="Workspace name"
          value=""
          defaultEditing
          onCommit={onCommit}
          onChange={onChange}
          onSubmit={onSubmit}
          onBlur={onBlur}
        />
        <div testId="elsewhere" tabIndex={0} style={{ height: 20 }}>
          Elsewhere
        </div>
      </div>
    );

    const edit = renderComponent(<Handled />);
    type(edit, "docs");
    const edits = onChange.mock.calls.length;
    edit.renderer.simulateKeystrokes("enter");
    const submits = onSubmit.mock.calls.length;

    clickCentreOf(edit, "name");
    type(edit, "!");
    edit.renderer.focusElement(
      edit.renderer.findByTestId("elsewhere")?.id ?? -1,
    );
    const blurs = onBlur.mock.calls.length;
    const commits = onCommit.mock.calls.map((call) => call[0]);
    edit.unmount();

    expect(edits).toBe(4);
    expect(submits).toBe(1);
    expect(blurs).toBe(1);
    expect(commits).toEqual(["docs", "!"]);
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
});
