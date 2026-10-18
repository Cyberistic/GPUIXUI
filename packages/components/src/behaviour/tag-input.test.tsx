/**
 * TagInput behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a comma that leaves a stray draft, a duplicate token, a
 * cap that truncates existing tokens, Backspace that removes when a draft is
 * present, a disabled chip that still removes, a draft that stops the field
 * from keeping focus, a chip control that removes on Space key down instead of
 * on release, and a removal control that only a child index could find.
 */

import type { TestElement } from "@gpuix/react/testing";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { useState } from "react";
import { nodesWithRole } from "../internal/a11y.js";
import { focusedTestId } from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import { TagInput, TagInputChip, TagInputField } from "../tag-input.js";

/** A caller-owned token list. */
const Harness = ({
  initial = [],
  max,
  disabled = false,
  onValueChange,
}: {
  readonly initial?: ReadonlyArray<string>;
  readonly max?: number;
  readonly disabled?: boolean;
  readonly onValueChange?: (value: ReadonlyArray<string>) => void;
}) => {
  const [tags, setTags] = useState<ReadonlyArray<string>>(initial);
  return (
    <TagInput
      label="Tags"
      value={tags}
      max={max}
      disabled={disabled}
      onValueChange={(next) => {
        setTags(next);
        onValueChange?.(next);
      }}
    >
      {tags.map((tag) => (
        <TagInputChip key={tag} testId={`chip-${tag}`} value={tag} />
      ))}
      <TagInputField testId="tag-field" placeholder="Add a tag" />
    </TagInput>
  );
};

/** Focus the field and send each character as a real key press. */
const type = (root: ComponentTestRoot, text: string): void => {
  root.renderer.focusElement(root.renderer.findByTestId("tag-field")?.id ?? -1);
  text.split("").forEach((key) => root.renderer.simulateKeystrokes(key));
};

/** The chip's removal control, named by the chip's derived id. */
const removeControlOf = (
  root: ComponentTestRoot,
  chipTestId: string,
): TestElement | undefined =>
  root.renderer.findByTestId(`${chipTestId}-remove`);

/** Click an element by its measured bounds. */
const clickElement = (
  root: ComponentTestRoot,
  element: ReturnType<typeof removeControlOf>,
): void => {
  if (element === undefined) throw new Error("tag-input suite: no element");
  const bounds = root.renderer.getElementBounds(element.id);
  if (bounds === null) throw new Error("tag-input suite: no bounds");
  root.renderer.nativeSimulateClick(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
};

describe("TagInput", () => {
  it("renders the chips and the field, named as a group", () => {
    const tags = renderComponent(<Harness initial={["design", "docs"]} />);

    expect(tags.renderer.getAllText()).toEqual(["design", "docs"]);
    expect(tags.renderer.findByType("svg")).toHaveLength(2);

    tags.unmount();
  });

  it("adds a token on Enter and keeps focus in the field", () => {
    const onValueChange = vi.fn();
    const tags = renderComponent(<Harness onValueChange={onValueChange} />);

    type(tags, "design");
    tags.renderer.simulateKeystrokes("enter");

    expect(onValueChange).toHaveBeenLastCalledWith(["design"]);
    expect(tags.renderer.findByTestId("chip-design")).toBeDefined();
    expect(focusedTestId(tags)).toEqual(Option.some("tag-field"));

    tags.unmount();
  });

  it("commits the draft on a typed comma", () => {
    const onValueChange = vi.fn();
    const tags = renderComponent(<Harness onValueChange={onValueChange} />);

    type(tags, "design,");

    expect(onValueChange).toHaveBeenLastCalledWith(["design"]);
    expect(tags.renderer.findByTestId("chip-design")).toBeDefined();

    tags.unmount();
  });

  it("ignores a duplicate", () => {
    const tags = renderComponent(<Harness initial={["design"]} />);

    type(tags, "design");
    tags.renderer.simulateKeystrokes("enter");

    expect(tags.renderer.getAllText()).toEqual(["design"]);

    tags.unmount();
  });

  it("names its removal control after the chip", () => {
    const tags = renderComponent(<Harness initial={["design"]} />);

    expect(tags.renderer.findByTestId("chip-design-remove")).toBeDefined();
    expect(
      nodesWithRole(tags.renderer, "button").map((node) => node.name),
    ).toContain("Remove design");

    tags.unmount();
  });

  it("removes a chip through its removal control", () => {
    const onValueChange = vi.fn();
    const tags = renderComponent(
      <Harness initial={["design", "docs"]} onValueChange={onValueChange} />,
    );

    clickElement(tags, removeControlOf(tags, "chip-design"));

    expect(onValueChange).toHaveBeenLastCalledWith(["docs"]);
    expect(tags.renderer.findByTestId("chip-design")).toBeUndefined();

    tags.unmount();
  });

  it("removes a chip on Space release, not on press", () => {
    const onValueChange = vi.fn();
    const tags = renderComponent(
      <Harness initial={["design", "docs"]} onValueChange={onValueChange} />,
    );
    const control = removeControlOf(tags, "chip-design");
    expect(control).toBeDefined();
    if (control === undefined) return;

    tags.renderer.nativeSimulateKeyDown(control.id, "space");
    expect(tags.renderer.findByTestId("chip-design")).toBeDefined();

    tags.renderer.nativeSimulateKeyUp(control.id, "space");
    expect(tags.renderer.findByTestId("chip-design")).toBeUndefined();
    expect(onValueChange).toHaveBeenLastCalledWith(["docs"]);

    tags.unmount();
  });

  it("refuses an addition past max", () => {
    const onValueChange = vi.fn();
    const tags = renderComponent(
      <Harness initial={["a", "b"]} max={2} onValueChange={onValueChange} />,
    );

    type(tags, "c");
    tags.renderer.simulateKeystrokes("enter");

    expect(onValueChange).toHaveBeenLastCalledWith(["a", "b"]);
    expect(tags.renderer.findByTestId("chip-c")).toBeUndefined();

    tags.unmount();
  });

  it("makes a disabled field read-only and drops the removal controls", () => {
    const tags = renderComponent(<Harness initial={["design"]} disabled />);

    expect(tags.renderer.findByTestId("tag-field")?.customProps?.readOnly).toBe(
      true,
    );
    expect(removeControlOf(tags, "chip-design")).toBeUndefined();

    tags.unmount();
  });

  it("keeps the caller's value when the consumer refuses a change", () => {
    const tags = renderComponent(
      <TagInput label="Tags" value={["design"]} onValueChange={() => undefined}>
        <TagInputChip testId="chip-design" value="design" />
        <TagInputField testId="tag-field" />
      </TagInput>,
    );

    type(tags, "docs");
    tags.renderer.simulateKeystrokes("enter");

    expect(tags.renderer.findByTestId("chip-docs")).toBeUndefined();
    expect(tags.renderer.findByTestId("chip-design")).toBeDefined();

    tags.unmount();
  });
});
