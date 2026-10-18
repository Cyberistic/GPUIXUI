/**
 * SearchInput behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: typing that never reached `onValueChange`; a clear
 * control offered on an empty field; a clear control offered on a disabled
 * field, where it was the only way to change a value the user cannot type
 * (plan 394); clearing that forgot to give focus back to
 * the field; Enter that submitted nothing; Escape that swallowed the key on an
 * empty field; a clear control that fired on Space key down instead of release;
 * a controlled field that changed its own display when the consumer said no; and
 * a caller `ref` that the internal focus ref silently replaced.
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
  disabled = false,
}: {
  readonly onValueChange?: (value: string) => void;
  readonly onSubmit?: (value: string) => void;
  readonly onClear?: () => void;
  readonly value?: string;
  readonly disabled?: boolean;
}) => (
  <div style={{ width: 360, padding: 40 }}>
    <SearchInput
      testId="search"
      value={value}
      disabled={disabled}
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
    expect(search.renderer.findByType("svg")).toHaveLength(1);

    type(search, "a");

    expect(search.renderer.findByTestId("search-clear")).toBeDefined();
    expect(search.renderer.findByType("svg")).toHaveLength(2);

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

  it("clears the field from the keyboard on Space release", () => {
    const onClear = vi.fn();
    const search = renderComponent(<Search onClear={onClear} />);
    type(search, "abc");
    const clearControl = search.renderer.findByTestId("search-clear");
    expect(clearControl).toBeDefined();
    if (clearControl === undefined) return;

    search.renderer.nativeSimulateKeyDown(clearControl.id, "space");
    expect(onClear).not.toHaveBeenCalled();

    search.renderer.nativeSimulateKeyUp(clearControl.id, "space");
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(search.renderer.findByTestId("search-clear")).toBeUndefined();

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

  it("offers no clear control while the field is disabled", () => {
    // A disabled field cannot be typed into, so a clear control there would be
    // the only way to change it — and it would change a value the user cannot
    // edit (plan 394). The enabled tree proves the same value still clears.
    const disabled = renderComponent(<Search value="draft" disabled />);

    expect(disabled.renderer.findByTestId("search-clear")).toBeUndefined();

    disabled.unmount();

    const enabled = renderComponent(<Search value="draft" />);

    expect(enabled.renderer.findByTestId("search-clear")).toBeDefined();

    enabled.unmount();
  });

  it("ignores Escape and Enter while the field is disabled", () => {
    // Hiding the clear control is not enough: Escape ran `clear` and Enter ran
    // `onSubmit` straight from the input, so a disabled field could still be
    // changed and submitted (plan 394).
    const onClear = vi.fn();
    const onSubmit = vi.fn();
    const search = renderComponent(
      <Search value="draft" disabled onClear={onClear} onSubmit={onSubmit} />,
    );

    search.renderer.focusElement(
      search.renderer.findByTestId("search")?.id ?? -1,
    );
    search.renderer.simulateKeystrokes("escape");
    search.renderer.simulateKeystrokes("enter");

    expect(onClear).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();

    search.unmount();
  });

  it("reflects autoFocus in its focus state", () => {
    // The runtime focuses `autoFocus` after React's effects, so `onFocus` never
    // runs; the public `focused` state must still be true (plan 388).
    const states: Array<boolean> = [];
    const search = renderComponent(
      <div style={{ width: 360, padding: 40 }}>
        <SearchInput
          testId="search"
          autoFocus
          style={(state) => {
            states.push(state.focused);
            return {};
          }}
        />
      </div>,
    );

    expect(focusedTestId(search)).toEqual(Option.some("search"));
    expect(states.at(-1)).toBe(true);

    search.unmount();
  });
});
