/**
 * MentionInput behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a list that never opens on `@`, a query that does not
 * narrow, arrows that do not move the highlight, Enter or a press that inserts
 * the wrong name, Escape/space that fail to close, a double `onMention`, a
 * disabled field that opens the list, a `maxVisible` a caller computed before
 * its row height was measured hiding every suggestion, a dismissed list that cut
 * instead of leaving, and a ghost the reader could still press.
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
  waitFor,
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

/** Let the runtime's frame loop publish what the last commit queued. */
const frame = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 30));

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

  it("inserts the highlighted name on Enter", async () => {
    const onMention = vi.fn();
    const mention = renderComponent(<Harness onMention={onMention} />);
    type(mention, "@an");

    mention.renderer.simulateKeystrokes("enter");

    expect(valueOf(mention)).toBe("@ana ");
    expect(onMention).toHaveBeenCalledTimes(1);
    expect(onMention).toHaveBeenCalledWith("ana");
    // The list runs its exit tween, then it is gone.
    await waitFor(() =>
      expect(mention.renderer.findByTestId("row-ana")).toBeUndefined(),
    );

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
    await frame();
    const entering = requireBounds(mention, "row-ana");
    mention.renderer.clockFastForward(400);
    await frame();
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
    await frame();
    // No journey: the first painted frame is the resting one.
    expect(requireBounds(reduced, "row-ana").y).toBe(rest.y);
    reduced.unmount();
  });

  it("closes on Escape without changing the text", async () => {
    const mention = renderComponent(<Harness />);
    type(mention, "@an");

    mention.renderer.simulateKeystrokes("escape");

    expect(valueOf(mention)).toBe("@an");
    await waitFor(() =>
      expect(mention.renderer.findByTestId("row-ana")).toBeUndefined(),
    );

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

    // A field that cannot act cuts its list: there is no gesture to finish, and
    // the box would fade over a control that refuses every route.
    expect(mention.renderer.findByTestId("row-ana")).toBeUndefined();
    expect(valueOf(mention)).toBe("@an");
    expect(onMention).not.toHaveBeenCalled();

    mention.unmount();
  });
});

describe("the list's exit", () => {
  it("stays painted for its exit and travels back out towards its field", async () => {
    // The bug this guards: the list was rendered from the query in the text and
    // returned nothing in the commit the query closed, so the one anchored
    // surface in the package that follows a query cut while every other panel
    // left. It now runs the same entrance frames in reverse.
    const mention = renderComponent(<Harness />);
    mention.renderer.clockPause();
    type(mention, "@");
    await frame();
    mention.renderer.clockFastForward(400);
    await frame();
    const resting = requireBounds(mention, "row-ana").y;

    mention.renderer.simulateKeystrokes("escape");
    await frame();
    expect(mention.renderer.findByTestId("row-ana")).toBeDefined();

    mention.renderer.clockFastForward(400);
    await frame();
    // Below its field, the list starts 4px closer to the field and leaves up.
    expect(requireBounds(mention, "row-ana").y).toBe(resting - 4);

    mention.renderer.clockResume();
    await waitFor(() =>
      expect(mention.renderer.findByTestId("row-ana")).toBeUndefined(),
    );
    mention.unmount();
  });

  it("keeps the rows it was showing while it leaves", async () => {
    const mention = renderComponent(<Harness />);
    type(mention, "@ann");
    expect(mention.renderer.findByTestId("row-anna")).toBeDefined();

    mention.renderer.simulateKeystrokes("escape");
    await frame();

    // The ghost is the list the reader dismissed, not a ranking of the empty
    // query: `ana` never matched `ann` and must not appear now.
    expect(mention.renderer.findByTestId("row-anna")).toBeDefined();
    expect(mention.renderer.findByTestId("row-ana")).toBeUndefined();
    expect(mention.renderer.findByTestId("row-joan")).toBeUndefined();

    await waitFor(() =>
      expect(mention.renderer.findByTestId("row-anna")).toBeUndefined(),
    );
    mention.unmount();
  });

  it("does not answer a press in a dismissed list, and drops the ghost from the tab order", async () => {
    // `pointerEvents` does not inherit in 0.11.0, so the rows keep their own
    // hitboxes while the box fades: the seam's shield is what stops a ghost row
    // inserting a name the reader has already dismissed. The runtime also decides
    // the Tab order element by element, so the row drops its own stop with the
    // box.
    const onMention = vi.fn();
    const mention = renderComponent(<Harness onMention={onMention} />);
    type(mention, "@an");

    mention.renderer.simulateKeystrokes("escape");
    await frame();
    clickCentreOf(mention, "row-ana");

    expect(onMention).not.toHaveBeenCalled();
    expect(valueOf(mention)).toBe("@an");
    expect(mention.renderer.findByTestId("row-ana")?.customProps?.tabIndex).toBe(
      -1,
    );
    mention.unmount();
  });

  it("holds the exit for the animated reader and drops it at once under reduced motion", async () => {
    const animated = renderComponent(<Harness />);
    type(animated, "@");
    await frame();
    animated.renderer.simulateKeystrokes("escape");
    await frame();
    // The same frame that closes the animated box still paints it: the exit is
    // the journey the preference below removes.
    expect(animated.renderer.findByTestId("row-ana")).toBeDefined();
    animated.unmount();

    const reduced = renderComponent(
      <MotionProvider preference="reduced">
        <Harness />
      </MotionProvider>,
    );
    type(reduced, "@");
    await frame();
    reduced.renderer.simulateKeystrokes("escape");
    await frame();
    expect(reduced.renderer.findByTestId("row-ana")).toBeUndefined();
    reduced.unmount();
  });
});
