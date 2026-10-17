/**
 * CommandMenu behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: the palette opening without focusing its input; a filter
 * that left non-matching labels visible; arrow keys that moved focus out of the
 * input (so typing stopped); Enter running the wrong row, running a disabled row,
 * or leaving the palette open; the empty label missing; a custom filter ignored;
 * Escape leaving the dialog up; a non-contiguous query that matched nothing; a
 * ranking that ran the wrong row; and a global sort that interleaved groups.
 */

import * as Option from "effect/Option";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { clickCentreOf, focusedTestId } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { CommandMenu, type CommandAction } from "../command-menu.js";

const actions = (
  perform: (id: string) => void,
): ReadonlyArray<CommandAction> => [
  {
    id: "open-file",
    label: "Open file",
    group: "Navigation",
    shortcut: "⌘O",
    perform: () => perform("open-file"),
  },
  {
    id: "open-recent",
    label: "Open recent",
    group: "Navigation",
    perform: () => perform("open-recent"),
  },
  {
    id: "save",
    label: "Save",
    group: "File",
    shortcut: "⌘S",
    perform: () => perform("save"),
  },
  {
    id: "export",
    label: "Export as PDF",
    group: "File",
    perform: () => perform("export"),
  },
  {
    id: "sidebar",
    label: "Toggle sidebar",
    group: "View",
    perform: () => perform("sidebar"),
  },
  {
    id: "delete",
    label: "Delete project",
    group: "View",
    disabled: true,
    perform: () => perform("delete"),
  },
];

/** The palette, controlled by a wrapper so `onOpenChange` really closes it. */
const Palette = ({
  perform,
  filter,
}: {
  readonly perform: (id: string) => void;
  readonly filter?: (action: CommandAction, query: string) => boolean;
}) => {
  const [open, setOpen] = useState(true);
  return (
    <CommandMenu
      open={open}
      onOpenChange={setOpen}
      actions={actions(perform)}
      filter={filter}
    />
  );
};

/** Type one character into whatever holds focus. */
const type = (root: ReturnType<typeof renderComponent>, text: string): void => {
  text.split("").forEach((key) => root.renderer.simulateKeystrokes(key));
};

/** A palette over a caller-supplied action set. */
const LocalPalette = ({
  items,
}: {
  readonly items: ReadonlyArray<CommandAction>;
}) => {
  const [open, setOpen] = useState(true);
  return <CommandMenu open={open} onOpenChange={setOpen} actions={items} />;
};

/** Two label matches where the better one is declared second. */
const rankedActions = (
  perform: (id: string) => void,
): ReadonlyArray<CommandAction> => [
  {
    id: "reopen",
    label: "Reopen file",
    group: "Files",
    perform: () => perform("reopen"),
  },
  {
    id: "open",
    label: "Open file",
    group: "Files",
    perform: () => perform("open"),
  },
];

/** The later group's row outranks the earlier one, so only per-group ranking keeps heading order. */
const groupedActions = (
  perform: (id: string) => void,
): ReadonlyArray<CommandAction> => [
  {
    id: "goto",
    label: "Go to line",
    group: "Navigation",
    perform: () => perform("goto"),
  },
  {
    id: "open",
    label: "Open file",
    group: "File",
    perform: () => perform("open"),
  },
];

describe("CommandMenu", () => {
  it("focuses the search input when it opens", () => {
    const palette = renderComponent(<Palette perform={vi.fn()} />);

    expect(focusedTestId(palette)).toEqual(Option.some("command-input"));

    palette.unmount();
  });

  it("filters the list as the query is typed", () => {
    const palette = renderComponent(<Palette perform={vi.fn()} />);

    type(palette, "op");

    const texts = palette.renderer.getAllText();
    expect(texts).toContain("Open file");
    expect(texts).toContain("Open recent");
    expect(texts).not.toContain("Save");
    expect(texts).not.toContain("Toggle sidebar");
    // Fuzzy, not substring: the `o` of "Export" and the `p` of "PDF" match.
    expect(texts).toContain("Export as PDF");
    // The input keeps focus while the list narrows.
    expect(focusedTestId(palette)).toEqual(Option.some("command-input"));

    palette.unmount();
  });

  it("runs the second match with ArrowDown and Enter, then closes", () => {
    const perform = vi.fn();
    const palette = renderComponent(<Palette perform={perform} />);

    type(palette, "op");
    palette.renderer.simulateKeystrokes("down");
    palette.renderer.simulateKeystrokes("enter");

    expect(perform).toHaveBeenCalledTimes(1);
    expect(perform).toHaveBeenCalledWith("open-recent");
    expect(palette.renderer.findByTestId("command-menu")).toBeUndefined();

    palette.unmount();
  });

  it("runs a clicked row", () => {
    const perform = vi.fn();
    const palette = renderComponent(<Palette perform={perform} />);

    clickCentreOf(palette, "command-save");

    expect(perform).toHaveBeenCalledWith("save");
    expect(palette.renderer.findByTestId("command-menu")).toBeUndefined();

    palette.unmount();
  });

  it("shows the empty label when nothing matches", () => {
    const palette = renderComponent(<Palette perform={vi.fn()} />);

    type(palette, "zzz");

    expect(palette.renderer.findByTestId("command-empty")).toBeDefined();
    expect(palette.renderer.getAllText()).toContain("No matching commands");

    palette.unmount();
  });

  it("uses a custom filter instead of the default", () => {
    const palette = renderComponent(
      <Palette perform={vi.fn()} filter={() => true} />,
    );

    type(palette, "op");

    expect(palette.renderer.getAllText()).toContain("Save");
    expect(palette.renderer.getAllText()).toContain("Toggle sidebar");

    palette.unmount();
  });

  it("cannot run a disabled action", () => {
    const perform = vi.fn();
    const palette = renderComponent(<Palette perform={perform} />);

    type(palette, "del");
    expect(palette.renderer.getAllText()).toContain("Delete project");

    palette.renderer.simulateKeystrokes("enter");

    expect(perform).not.toHaveBeenCalled();
    expect(palette.renderer.findByTestId("command-menu")).toBeDefined();

    palette.unmount();
  });

  it("closes on Escape", () => {
    const palette = renderComponent(<Palette perform={vi.fn()} />);

    palette.renderer.simulateKeystrokes("escape");

    expect(palette.renderer.findByTestId("command-menu")).toBeUndefined();

    palette.unmount();
  });

  it("matches a non-contiguous query by initials", () => {
    const perform = vi.fn();
    const palette = renderComponent(<Palette perform={perform} />);

    type(palette, "opfl");

    const texts = palette.renderer.getAllText();
    expect(texts).toContain("Open file");
    expect(texts).not.toContain("Open recent");
    expect(palette.renderer.findByTestId("command-empty")).toBeUndefined();

    palette.renderer.simulateKeystrokes("enter");
    expect(perform).toHaveBeenCalledWith("open-file");

    palette.unmount();
  });

  it("runs the best-ranked row, not the first declared", () => {
    const perform = vi.fn();
    const palette = renderComponent(
      <LocalPalette items={rankedActions(perform)} />,
    );

    type(palette, "open");

    expect(
      palette.renderer.findByTestId("command-open")?.customProps?.[
        "aria-selected"
      ],
    ).toBe(true);
    expect(
      palette.renderer.findByTestId("command-reopen")?.customProps?.[
        "aria-selected"
      ],
    ).toBe(false);

    palette.renderer.simulateKeystrokes("enter");
    expect(perform).toHaveBeenCalledWith("open");

    palette.unmount();
  });

  it("keeps groups in declaration order while ranking inside them", () => {
    const perform = vi.fn();
    const palette = renderComponent(
      <LocalPalette items={groupedActions(perform)} />,
    );

    type(palette, "o");

    const texts = palette.renderer.getAllText();
    const navigation = texts.indexOf("Navigation");
    const file = texts.indexOf("File");
    expect(navigation).toBeGreaterThanOrEqual(0);
    expect(file).toBeGreaterThan(navigation);
    expect(texts.filter((text) => text === "Navigation")).toHaveLength(1);
    expect(texts.filter((text) => text === "File")).toHaveLength(1);

    palette.unmount();
  });

  it("keeps declaration order for an empty query", () => {
    const palette = renderComponent(<Palette perform={vi.fn()} />);

    expect(
      palette.renderer.findByTestId("command-open-file")?.customProps?.[
        "aria-selected"
      ],
    ).toBe(true);
    expect(palette.renderer.getAllText()).toContain("Toggle sidebar");

    palette.unmount();
  });
});
