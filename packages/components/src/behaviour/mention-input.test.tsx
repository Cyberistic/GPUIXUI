/**
 * MentionInput behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a list that never opens on `@`, a query that does not
 * narrow, arrows that do not move the highlight, Enter or a press that inserts
 * the wrong name, Escape/space that fail to close, a double `onMention`, a
 * disabled field that opens the list, and a `maxVisible` a caller computed before
 * its row height was measured hiding every suggestion.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { useState } from "react";
import {
  MentionInput,
  MentionInputItem,
  MentionInputList,
} from "../mention-input.js";
import {
  clickCentreOf,
  focusedTestId,
  requireBounds,
} from "../internal/interaction.js";
import { nodesWithRole } from "../internal/a11y.js";
import { MotionProvider } from "../motion.js";
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
}: {
  readonly initial?: string;
  readonly disabled?: boolean;
  readonly onValueChange?: (value: string) => void;
  readonly onMention?: (value: string) => void;
}) => {
  const [text, setText] = useState(initial);
  return (
    <div style={{ width: 360 }}>
      <MentionInput
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
          <MentionInputItem testId="row-ana" value="ana" />
          <MentionInputItem testId="row-anna" value="anna" />
          <MentionInputItem testId="row-joan" value="joan" />
        </MentionInputList>
      </MentionInput>
    </div>
  );
};

/** Focus the field and type each character as a real key press. */
const type = (root: ComponentTestRoot, text: string): void => {
  root.renderer.focusElement(root.renderer.findByTestId("mention")?.id ?? -1);
  text.split("").forEach((key) => root.renderer.simulateKeystrokes(key));
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

  it("arrives on the house entrance, and paints at rest when motion is reduced", async () => {
    const mention = renderComponent(<Harness />);
    mention.renderer.clockPause();
    type(mention, "@");
    // The frame loop publishes the mounted list on the next tick.
    await new Promise((resolve) => setTimeout(resolve, 30));
    const entering = requireBounds(mention, "row-ana");
    mention.renderer.clockFastForward(400);
    await new Promise((resolve) => setTimeout(resolve, 30));
    const rest = requireBounds(mention, "row-ana");
    // The list starts 4px above its resting place and travels down into it.
    expect(rest.y - entering.y).toBe(4);
    mention.unmount();

    const reduced = renderComponent(
      <MotionProvider preference="reduced">
        <Harness />
      </MotionProvider>,
    );
    reduced.renderer.clockPause();
    type(reduced, "@");
    await new Promise((resolve) => setTimeout(resolve, 30));
    // No journey: the first painted frame is the resting one.
    expect(requireBounds(reduced, "row-ana").y).toBe(rest.y);
    reduced.unmount();
  });

  it("closes on Escape without changing the text", () => {
    const mention = renderComponent(<Harness />);
    type(mention, "@an");

    mention.renderer.simulateKeystrokes("escape");

    expect(mention.renderer.findByTestId("row-ana")).toBeUndefined();
    expect(valueOf(mention)).toBe("@an");

    mention.unmount();
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

  it("shows the house budget for a maxVisible that cannot be measured", () => {
    // `maxVisible` is usually `Math.floor(availableHeight / rowHeight)`, which
    // is `NaN` until the first layout. `Math.max(0, NaN)` kept it `NaN` and
    // `Arr.take(list, NaN)` is empty, so a query painted no row at all.
    const mention = renderComponent(
      <div style={{ width: 360 }}>
        <MentionInput testId="mention" label="Comment" maxVisible={Number.NaN}>
          <MentionInputList>
            <MentionInputItem testId="row-ana" value="ana" />
            <MentionInputItem testId="row-anna" value="anna" />
          </MentionInputList>
        </MentionInput>
      </div>,
    );

    type(mention, "@an");

    expect(mention.renderer.findByTestId("row-ana")).toBeDefined();
    expect(mention.renderer.findByTestId("row-anna")).toBeDefined();

    mention.unmount();
  });

  it("offers no row for a query a disabled field already carries", () => {
    const onMention = vi.fn();
    const mention = renderComponent(
      <Harness initial="@an" disabled onMention={onMention} />,
    );

    expect(
      mention.renderer.findByTestId("mention")?.customProps?.tabIndex,
    ).toBe(-1);
    expect(mention.renderer.findByTestId("row-ana")).toBeUndefined();
    expect(mention.renderer.findByTestId("row-anna")).toBeUndefined();
    expect(onMention).not.toHaveBeenCalled();

    mention.unmount();
  });

  it("closes a list that was open when the field became disabled", () => {
    const onMention = vi.fn();
    const mention = renderComponent(
      <Harness initial="@an" onMention={onMention} />,
    );
    expect(mention.renderer.findByTestId("row-ana")).toBeDefined();

    mention.rerender(<Harness initial="@an" disabled onMention={onMention} />);

    expect(mention.renderer.findByTestId("row-ana")).toBeUndefined();
    expect(valueOf(mention)).toBe("@an");
    expect(onMention).not.toHaveBeenCalled();

    mention.unmount();
  });
});
