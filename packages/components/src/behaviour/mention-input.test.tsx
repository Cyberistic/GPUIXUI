/**
 * MentionInput behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a list that never opens on `@`, a query that does not
 * narrow, arrows that do not move the highlight, Enter or a press that inserts
 * the wrong name, Escape/space that fail to close, a double `onMention`, and a
 * disabled field that opens the list.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "../dialog.js";
import {
  MentionInput,
  MentionInputItem,
  MentionInputList,
  type MentionInputItemProps,
  type MentionInputProps,
} from "../mention-input.js";
import {
  clickCentreOf,
  finishMotion,
  focusedTestId,
} from "../internal/interaction.js";
import { nodesWithRole } from "../internal/a11y.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";

/** A comment composer with three candidates. */
const Harness = ({
  initial = "",
  disabled = false,
  onValueChange,
  onMention,
  host,
  row,
}: {
  readonly initial?: string;
  readonly disabled?: boolean;
  readonly onValueChange?: (value: string) => void;
  readonly onMention?: (value: string) => void;
  readonly host?: Partial<MentionInputProps>;
  readonly row?: Partial<MentionInputItemProps>;
}) => {
  const [text, setText] = useState(initial);
  return (
    <div style={{ width: 360 }}>
      <MentionInput
        {...host}
        testId="mention"
        label="Comment"
        value={text}
        disabled={disabled}
        onValueChange={(next) => {
          setText(next);
          onValueChange?.(next);
        }}
        onMention={onMention}
      >
        <MentionInputList>
          <MentionInputItem {...row} testId="row-ana" value="ana" />
          <MentionInputItem testId="row-anna" value="anna" />
          <MentionInputItem testId="row-joan" value="joan" />
        </MentionInputList>
      </MentionInput>
      <div testId="elsewhere" tabIndex={0} style={{ height: 20 }}>
        Elsewhere
      </div>
    </div>
  );
};

/** Focus the field and type each character as a real key press. */
const type = (root: ComponentTestRoot, text: string): void => {
  root.renderer.focusElement(root.renderer.findByTestId("mention")?.id ?? -1);
  text.split("").forEach((key) => root.renderer.simulateKeystrokes(key));
};

/** An open dialog whose content holds the mention composer. */
const InDialog = () => {
  const [open, setOpen] = useState(true);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent label="Comment" testId="dialog">
        <DialogTitle>Comment</DialogTitle>
        <Harness />
      </DialogContent>
    </Dialog>
  );
};

const valueOf = (root: ComponentTestRoot): unknown =>
  root.renderer.findByTestId("mention")?.customProps?.value;

describe("MentionInput", () => {
  it("opens the list on @ with every candidate", () => {
    const mention = renderComponent(<Harness />);

    type(mention, "@");

    expect(focusedTestId(mention)).toEqual(Option.some("mention"));
    expect(mention.renderer.findByTestId("row-ana")).toBeDefined();
    expect(mention.renderer.findByTestId("row-anna")).toBeDefined();
    expect(mention.renderer.findByTestId("row-joan")).toBeDefined();
    expect(nodesWithRole(mention.renderer, "button")).toHaveLength(3);

    mention.unmount();
  });

  it("narrows the list as the query is typed", () => {
    const mention = renderComponent(<Harness />);

    type(mention, "@ann");

    expect(mention.renderer.findByTestId("row-anna")).toBeDefined();
    expect(mention.renderer.findByTestId("row-ana")).toBeUndefined();
    expect(mention.renderer.findByTestId("row-joan")).toBeUndefined();

    mention.unmount();
  });

  it("moves the highlight with the arrow keys", () => {
    const mention = renderComponent(<Harness />);
    type(mention, "@an");

    expect(mention.renderer.findByTestId("row-ana")?.customProps).toMatchObject(
      {
        "aria-selected": true,
      },
    );

    mention.renderer.simulateKeystrokes("down");
    expect(
      mention.renderer.findByTestId("row-anna")?.customProps,
    ).toMatchObject({ "aria-selected": true });

    mention.renderer.simulateKeystrokes("up");
    expect(mention.renderer.findByTestId("row-ana")?.customProps).toMatchObject(
      {
        "aria-selected": true,
      },
    );

    mention.unmount();
  });

  it("inserts the highlighted name on Enter", () => {
    const onMention = vi.fn();
    const mention = renderComponent(<Harness onMention={onMention} />);
    type(mention, "@an");

    mention.renderer.simulateKeystrokes("enter");

    expect(valueOf(mention)).toBe("@ana ");
    expect(onMention).toHaveBeenCalledTimes(1);
    expect(onMention).toHaveBeenCalledWith("ana");
    expect(mention.renderer.findByTestId("row-ana")).toBeUndefined();

    mention.unmount();
  });

  it("inserts a pressed row", () => {
    const onMention = vi.fn();
    const mention = renderComponent(<Harness onMention={onMention} />);
    type(mention, "@an");

    clickCentreOf(mention, "row-anna");

    expect(valueOf(mention)).toBe("@anna ");
    expect(onMention).toHaveBeenCalledWith("anna");

    mention.unmount();
  });

  it("closes on Escape without changing the text", () => {
    const mention = renderComponent(<Harness />);
    type(mention, "@an");

    mention.renderer.simulateKeystrokes("escape");

    expect(mention.renderer.findByTestId("row-ana")).toBeUndefined();
    expect(valueOf(mention)).toBe("@an");

    mention.unmount();
  });

  it("closes one surface per Escape inside a dialog", () => {
    const nested = renderComponent(<InDialog />);
    type(nested, "@");

    expect(nested.renderer.findByTestId("row-ana")).toBeDefined();

    nested.renderer.simulateKeystrokes("escape");

    expect(nested.renderer.findByTestId("row-ana")).toBeUndefined();
    expect(nested.renderer.findByTestId("dialog")).toBeDefined();

    nested.renderer.simulateKeystrokes("escape");

    finishMotion(nested);
    expect(nested.renderer.findByTestId("dialog")).toBeUndefined();

    nested.unmount();
  });

  it("closes from a focused row without closing the dialog", () => {
    const nested = renderComponent(<InDialog />);
    type(nested, "@");

    const row = nested.renderer.findByTestId("row-ana");
    nested.renderer.focusElement(row?.id ?? -1);
    expect(focusedTestId(nested)).toEqual(Option.some("row-ana"));

    nested.renderer.simulateKeystrokes("escape");

    expect(nested.renderer.findByTestId("row-ana")).toBeUndefined();
    expect(nested.renderer.findByTestId("dialog")).toBeDefined();

    nested.unmount();
  });

  it("closes when the query matches nothing", () => {
    const mention = renderComponent(<Harness />);
    type(mention, "@");

    expect(mention.renderer.findByTestId("row-ana")).toBeDefined();
    type(mention, "zzz");

    expect(mention.renderer.findByTestId("row-ana")).toBeUndefined();
    expect(valueOf(mention)).toBe("@zzz");

    mention.unmount();
  });

  it("reports the value and the mention once per insertion", () => {
    const onValueChange = vi.fn();
    const onMention = vi.fn();
    const mention = renderComponent(
      <Harness onValueChange={onValueChange} onMention={onMention} />,
    );
    type(mention, "@an");
    mention.renderer.simulateKeystrokes("enter");

    expect(onValueChange).toHaveBeenLastCalledWith("@ana ");
    expect(onMention).toHaveBeenCalledTimes(1);

    mention.unmount();
  });

  it("is read-only and inert when disabled", () => {
    const mention = renderComponent(<Harness disabled />);

    expect(
      mention.renderer.findByTestId("mention")?.customProps?.readOnly,
    ).toBe(true);

    type(mention, "@");
    expect(mention.renderer.findByTestId("row-ana")).toBeUndefined();

    mention.unmount();
  });

  it("composes the caller's field handlers", () => {
    const onKeyDown = vi.fn();
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const mention = renderComponent(
      <Harness host={{ onKeyDown, onFocus, onBlur }} />,
    );

    type(mention, "@");

    expect(onFocus).toHaveBeenCalled();
    expect(onKeyDown).toHaveBeenCalled();
    expect(mention.renderer.findByTestId("row-ana")).toBeDefined();

    mention.renderer.focusElement(
      mention.renderer.findByTestId("elsewhere")?.id ?? -1,
    );
    expect(onBlur).toHaveBeenCalledTimes(1);

    mention.unmount();
  });

  it("composes the caller's row handlers", () => {
    const onMouseDown = vi.fn();
    const onKeyDown = vi.fn();
    const onMention = vi.fn();

    const pressed = renderComponent(
      <Harness row={{ onMouseDown, onKeyDown }} onMention={onMention} />,
    );
    type(pressed, "@an");
    clickCentreOf(pressed, "row-ana");

    expect(onMouseDown).toHaveBeenCalledTimes(1);
    expect(onMention).toHaveBeenCalledWith("ana");
    pressed.unmount();

    onMention.mockClear();
    const keyed = renderComponent(
      <Harness row={{ onMouseDown, onKeyDown }} onMention={onMention} />,
    );
    type(keyed, "@an");
    keyed.renderer.focusElement(
      keyed.renderer.findByTestId("row-ana")?.id ?? -1,
    );
    keyed.renderer.simulateKeystrokes("enter");

    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onMention).toHaveBeenCalledWith("ana");
    keyed.unmount();
  });

  /**
   * Focus visibility (plan 522). The bugs these guard, measured: a row focused
   * with Tab that is not the highlighted row painted nothing, and an
   * `autoFocus` field focused natively without running `onFocus`, so the
   * group's ring never lit.
   */
  it("paints the focus ring on a focused row", () => {
    const mention = renderComponent(<Harness />);
    type(mention, "@an");

    mention.renderer.focusElement(
      mention.renderer.findByTestId("row-anna")?.id ?? -1,
    );

    expect(focusedTestId(mention)).toEqual(Option.some("row-anna"));
    expect(
      mention.renderer.findByTestId("row-anna")?.style.boxShadow,
    ).toBeDefined();
    // The highlighted row paints the selection fill, not the ring.
    expect(
      mention.renderer.findByTestId("row-ana")?.style.boxShadow,
    ).toBeUndefined();

    mention.unmount();
  });

  it("seeds the group ring from autoFocus", () => {
    const mention = renderComponent(<Harness host={{ autoFocus: true }} />);

    expect(focusedTestId(mention)).toEqual(Option.some("mention"));
    expect(
      mention.renderer.findByTestId("mention-group")?.style.boxShadow,
    ).toBeDefined();

    mention.unmount();
  });

  /**
   * A disabled field is inert (plan 527, continuing plan 394). The bug this
   * guards, measured: `autoFocus` focused a disabled field and it stayed in the
   * tab order, announced `Disabled` while behaving as an ordinary control.
   */
  it("ignores autoFocus and leaves the tab order when disabled", () => {
    const mention = renderComponent(
      <Harness disabled host={{ autoFocus: true }} />,
    );

    expect(focusedTestId(mention)).toEqual(Option.none());
    expect(
      mention.renderer.findByTestId("mention")?.customProps?.tabIndex,
    ).toBe(-1);
    expect(
      mention.renderer.findByTestId("mention-group")?.style.boxShadow,
    ).toBeUndefined();

    mention.unmount();
  });

  it("paints no ring when a disabled field is focused", () => {
    const mention = renderComponent(<Harness disabled />);

    mention.renderer.focusElement(
      mention.renderer.findByTestId("mention")?.id ?? -1,
    );
    mention.renderer.flush();

    expect(
      mention.renderer.findByTestId("mention-group")?.style.boxShadow,
    ).toBeUndefined();

    mention.unmount();
  });
});
