/**
 * SearchInput behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: typing that never reached `onValueChange`; a clear
 * control offered on an empty field; clearing that forgot to give focus back to
 * the field; Enter that submitted nothing; Escape that swallowed the key on an
 * empty field; a controlled field that changed its own display when the consumer
 * said no; and a caller `ref` that the internal focus ref silently replaced.
 */

import { describe, expect, it, vi } from "vitest";
import type { PublicInstance } from "@gpuix/react";
import * as Option from "effect/Option";
import { createRef } from "react";
import { clickCentreOf, focusedTestId } from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import { SearchInput } from "../search-input.js";

const Search = ({
  onValueChange,
  onSubmit,
  onClear,
  value,
}: {
  readonly onValueChange?: (value: string) => void;
  readonly onSubmit?: (value: string) => void;
  readonly onClear?: () => void;
  readonly value?: string;
}) => (
  <div style={{ width: 360, padding: 40 }}>
    <SearchInput
      testId="search"
      value={value}
      onValueChange={onValueChange}
      onSubmit={onSubmit}
      onClear={onClear}
    />
  </div>
);

/** Focus the field, then send each character as a real key press. */
const type = (root: ComponentTestRoot, text: string): void => {
  root.renderer.focusElement(root.renderer.findByTestId("search")?.id ?? -1);
  text.split("").forEach((key) => root.renderer.simulateKeystrokes(key));
};

describe("SearchInput", () => {
  it("reports each keystroke to onValueChange", () => {
    const onValueChange = vi.fn();
    const search = renderComponent(<Search onValueChange={onValueChange} />);

    type(search, "gpui");

    expect(onValueChange.mock.calls.at(-1)).toEqual(["gpui"]);

    search.unmount();
  });

  it("shows the clear control only when there is text", () => {
    const search = renderComponent(<Search />);

    expect(search.renderer.findByTestId("search-clear")).toBeUndefined();

    type(search, "a");

    expect(search.renderer.findByTestId("search-clear")).toBeDefined();

    search.unmount();
  });

  it("clears, reports and returns focus to the field", () => {
    const onClear = vi.fn();
    const search = renderComponent(<Search onClear={onClear} />);
    type(search, "abc");

    clickCentreOf(search, "search-clear");

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(search.renderer.findByTestId("search-clear")).toBeUndefined();
    expect(focusedTestId(search)).toEqual(Option.some("search"));

    search.unmount();
  });

  it("submits the current text on Enter", () => {
    const onSubmit = vi.fn();
    const search = renderComponent(<Search onSubmit={onSubmit} />);

    type(search, "hooks");
    search.renderer.simulateKeystrokes("enter");

    expect(onSubmit).toHaveBeenCalledWith("hooks");

    search.unmount();
  });

  it("clears on Escape only when there is text", () => {
    const onClear = vi.fn();
    const search = renderComponent(<Search onClear={onClear} />);
    type(search, "abc");

    search.renderer.simulateKeystrokes("escape");
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(search.renderer.findByTestId("search-clear")).toBeUndefined();

    search.renderer.simulateKeystrokes("escape");
    expect(onClear).toHaveBeenCalledTimes(1);

    search.unmount();
  });

  it("keeps a controlled field where the consumer put it", () => {
    const onValueChange = vi.fn();
    const search = renderComponent(
      <Search value="" onValueChange={onValueChange} />,
    );

    type(search, "a");

    expect(onValueChange).toHaveBeenCalledWith("a");
    // The consumer did not adopt the value, so the field is still empty.
    expect(search.renderer.findByTestId("search-clear")).toBeUndefined();

    search.unmount();
  });

  it("feeds both the internal and the caller's ref", () => {
    const ref = createRef<PublicInstance>();
    const search = renderComponent(
      <div style={{ width: 360, padding: 40 }}>
        <SearchInput ref={ref} testId="search" />
      </div>,
    );

    expect(ref.current?.id).toBe(search.renderer.findByTestId("search")?.id);

    // The internal ref still points at the same node: clearing focuses it.
    type(search, "abc");
    clickCentreOf(search, "search-clear");
    expect(focusedTestId(search)).toEqual(Option.some("search"));

    search.unmount();
  });
});
