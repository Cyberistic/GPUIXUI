/**
 * SearchInput behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: typing that never reached `onValueChange`; a clear
 * control offered on an empty field; a clear control offered on a disabled
 * field, where it was the only way to change a value the user cannot type
 * (plan 394); clearing that forgot to give focus back to
 * the field; Enter that submitted nothing; Escape that swallowed the key on an
 * empty field; a clear control that fired on Space key down instead of release;
 * a controlled field that changed its own display when the consumer said no; a
 * caller `ref` that the internal ref silently replaced; and an Escape that
 * cleared the field and closed the dialog around it (plan 514).
 */

import { describe, expect, it, vi } from "vitest";
import type { PublicInstance } from "@gpuix/react";
import * as Option from "effect/Option";
import { createRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "../dialog.js";
import {
  clickCentreOf,
  finishMotion,
  focusedTestId,
  nextTask,
  until,
} from "../internal/interaction.js";
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

/** A search field inside an open dialog. */
const InDialog = ({ defaultValue }: { readonly defaultValue?: string }) => {
  const [open, setOpen] = useState(true);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent label="Search" testId="dialog">
        <DialogTitle>Search</DialogTitle>
        <SearchInput testId="search" defaultValue={defaultValue} />
      </DialogContent>
    </Dialog>
  );
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

  it("keeps a dialog open for the Escape that clears it", async () => {
    // Before plan 514 a non-empty field cleared and the enclosing dialog closed
    // on the same press, because the field handled Escape without claiming it.
    const nested = renderComponent(<InDialog defaultValue="abc" />);
    nested.renderer.focusElement(
      nested.renderer.findByTestId("search")?.id ?? -1,
    );

    nested.renderer.simulateKeystrokes("escape");

    expect(nested.renderer.findByTestId("search-clear")).toBeUndefined();
    expect(nested.renderer.findByTestId("dialog")).toBeDefined();

    // A real second Escape is a new task, not the same propagation (plan 669).
    await nextTask();
    nested.renderer.simulateKeystrokes("escape");
    finishMotion(nested);
    expect(nested.renderer.findByTestId("dialog")).toBeUndefined();

    nested.unmount();
  });

  it("leaves Escape to a dialog when there is nothing to clear", () => {
    const nested = renderComponent(<InDialog />);
    nested.renderer.focusElement(
      nested.renderer.findByTestId("search")?.id ?? -1,
    );

    nested.renderer.simulateKeystrokes("escape");

    finishMotion(nested);
    expect(nested.renderer.findByTestId("dialog")).toBeUndefined();

    nested.unmount();
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

  /**
   * Focus visibility (plan 522, recorded by plan 649 §8). The bug this guards:
   * the clear control was a tab stop that took native focus and painted no
   * ring, so a keyboard user could not see that the next Space would clear the
   * query. The binding delivers no React focus event for the move (plan 540),
   * so the ring follows a sampled `getFocusedElementId()` (plan 659).
   */
  it("paints the focus ring on the clear control", async () => {
    const search = renderComponent(
      <div style={{ width: 360, padding: 40 }}>
        <SearchInput testId="search" autoFocus defaultValue="abc" />
      </div>,
    );
    expect(search.renderer.findByTestId("search-clear")).toBeDefined();

    search.renderer.focusNext(); // input -> clear, with no React focus event

    await until(
      () =>
        search.renderer.findByTestId("search-clear")?.style.boxShadow !==
        undefined,
    );

    expect(focusedTestId(search)).toEqual(Option.some("search-clear"));
    expect(
      search.renderer.findByTestId("search-clear")?.style.boxShadow,
    ).toBeDefined();
    // Only the control that owns focus rings; the field surface does not.
    expect(
      search.renderer
        .findByType("div")
        .filter((div) => div.style?.boxShadow !== undefined)
        .map((div) => div.testId),
    ).toEqual(["search-clear"]);

    search.unmount();
  });

  /**
   * The bug this guards (plans 536/540): a native focus change delivers no
   * React blur, so the field surface kept its ring after focus left it. The
   * sampler clears both rings and restores the field's when focus returns.
   */
  it("moves the focus ring with the natively focused host", async () => {
    const search = renderComponent(
      <div style={{ width: 360, padding: 40, gap: 8 }}>
        <SearchInput testId="search" autoFocus defaultValue="abc" />
        <div testId="elsewhere" tabIndex={0} style={{ height: 20 }} />
      </div>,
    );
    // `findByTestId("search")` is the inner input; the ring is painted by the
    // anonymous field surface, the only div that carries a `boxShadow`.
    const ringed = (): ReadonlyArray<string | undefined> =>
      search.renderer
        .findByType("div")
        .filter((div) => div.style?.boxShadow !== undefined)
        .map((div) => div.testId);

    expect(ringed()).toEqual([undefined]);

    search.renderer.focusNext(); // input -> clear
    search.renderer.focusNext(); // clear -> the other field's input

    await until(() => ringed().length === 0);

    expect(ringed()).toEqual([]);

    search.renderer.focusElement(
      search.renderer.findByTestId("search")?.id ?? -1,
    );

    await until(() => ringed().length === 1);

    expect(ringed()).toEqual([undefined]);

    search.unmount();
  });

  /**
   * The bug this guards (plan 660): the sampler only ran while the field had
   * text, so `focusElement` on an empty field moved native focus without
   * painting the ring, because the binding delivers no React `onFocus`.
   */
  it("paints the ring on an empty field focused by code", async () => {
    const search = renderComponent(
      <div style={{ width: 360, padding: 40, gap: 8 }}>
        <SearchInput testId="search" />
        <SearchInput testId="other" />
      </div>,
    );
    const ringed = (): ReadonlyArray<string | undefined> =>
      search.renderer
        .findByType("div")
        .filter((div) => div.style?.boxShadow !== undefined)
        .map((div) => div.testId);

    search.renderer.focusElement(
      search.renderer.findByTestId("search")?.id ?? -1,
    );

    await until(() => ringed().length === 1);

    expect(ringed()).toEqual([undefined]);
    expect(focusedTestId(search)).toEqual(Option.some("search"));

    search.unmount();
  });

  /**
   * The bug this guards (plan 660): the seeded ring on an empty field never
   * cleared after a native focus move, because no React `blur` is delivered
   * (plans 536/540) and the sampler did not run without text.
   */
  it("clears the ring when an empty field loses focus", async () => {
    const search = renderComponent(
      <div style={{ width: 360, padding: 40, gap: 8 }}>
        <SearchInput testId="search" autoFocus />
        <div testId="elsewhere" tabIndex={0} style={{ height: 20 }} />
      </div>,
    );
    const ringed = (): ReadonlyArray<string | undefined> =>
      search.renderer
        .findByType("div")
        .filter((div) => div.style?.boxShadow !== undefined)
        .map((div) => div.testId);

    expect(ringed()).toEqual([undefined]);

    search.renderer.focusNext();

    await until(() => ringed().length === 0);

    expect(ringed()).toEqual([]);
    expect(focusedTestId(search)).toEqual(Option.some("elsewhere"));

    search.unmount();
  });

  /**
   * The bug this guards (plan 660, plan 394): disabling a focused field
   * cleared only the clear control's state, so the surface kept the ring and
   * the public `focused` state stayed true on a control the user cannot edit.
   */
  it("drops the ring when a focused field becomes disabled", async () => {
    const states: Array<boolean> = [];
    const style = (state: { readonly focused: boolean }) => {
      states.push(state.focused);
      return {};
    };
    const search = renderComponent(
      <div style={{ width: 360, padding: 40 }}>
        <SearchInput
          testId="search"
          autoFocus
          defaultValue="abc"
          style={style}
        />
      </div>,
    );
    const ringed = (): ReadonlyArray<string | undefined> =>
      search.renderer
        .findByType("div")
        .filter((div) => div.style?.boxShadow !== undefined)
        .map((div) => div.testId);

    expect(ringed()).toEqual([undefined]);

    search.rerender(
      <div style={{ width: 360, padding: 40 }}>
        <SearchInput
          testId="search"
          autoFocus
          defaultValue="abc"
          disabled
          style={style}
        />
      </div>,
    );

    await until(() => ringed().length === 0);
    await until(() => states.at(-1) === false);

    expect(ringed()).toEqual([]);
    expect(states.at(-1)).toBe(false);

    search.unmount();
  });
});
