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
import { Button } from "../internal/button.js";
import {
  clickCentreOf,
  waitFor,
  focusedTestId,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { darkTheme } from "../internal/theme.js";
import {
  CommandMenu,
  CommandMenuEmpty,
  CommandMenuInput,
  CommandMenuList,
  type CommandAction,
} from "../command-menu.js";

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
  recents,
}: {
  readonly perform: (id: string) => void;
  readonly filter?: (action: CommandAction, query: string) => boolean;
  readonly recents?: ReadonlyArray<string>;
}) => {
  const [open, setOpen] = useState(true);
  return (
    <CommandMenu
      open={open}
      onOpenChange={setOpen}
      actions={actions(perform)}
      filter={filter}
      {...(recents === undefined ? {} : { recents })}
    >
      <CommandMenuInput />
      <CommandMenuList />
      <CommandMenuEmpty />
    </CommandMenu>
  );
};

/** A palette with a trigger, so the close can be measured against its opener. */
const OpenedPalette = ({
  perform,
}: {
  readonly perform: (id: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Button testId="palette-opener" onClick={() => setOpen(true)}>
        Open palette
      </Button>
      <CommandMenu
        open={open}
        onOpenChange={setOpen}
        actions={actions(perform)}
      >
        <CommandMenuInput />
        <CommandMenuList />
        <CommandMenuEmpty />
      </CommandMenu>
    </div>
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
  return (
    <CommandMenu open={open} onOpenChange={setOpen} actions={items}>
      <CommandMenuInput />
      <CommandMenuList />
      <CommandMenuEmpty />
    </CommandMenu>
  );
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

  it("returns focus to the opener when it closes", async () => {
    const palette = renderComponent(<OpenedPalette perform={vi.fn()} />);

    palette.renderer.focusElement(
      palette.renderer.findByTestId("palette-opener")?.id ?? -1,
    );
    clickCentreOf(palette, "palette-opener");
    expect(focusedTestId(palette)).toEqual(Option.some("command-input"));

    palette.renderer.simulateKeystrokes("escape");

    await waitFor(() =>
      expect(palette.renderer.findByTestId("command-menu")).toBeUndefined(),
    );
    expect(focusedTestId(palette)).toEqual(Option.some("palette-opener"));

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

  it("runs the second match with ArrowDown and Enter, then closes", async () => {
    const perform = vi.fn();
    const palette = renderComponent(<Palette perform={perform} />);

    type(palette, "op");
    palette.renderer.simulateKeystrokes("down");
    palette.renderer.simulateKeystrokes("enter");

    expect(perform).toHaveBeenCalledTimes(1);
    expect(perform).toHaveBeenCalledWith("open-recent");
    await waitFor(() =>
      expect(palette.renderer.findByTestId("command-menu")).toBeUndefined(),
    );

    palette.unmount();
  });

  it("runs a clicked row", async () => {
    const perform = vi.fn();
    const palette = renderComponent(<Palette perform={perform} />);

    clickCentreOf(palette, "command-save");

    expect(perform).toHaveBeenCalledWith("save");
    await waitFor(() =>
      expect(palette.renderer.findByTestId("command-menu")).toBeUndefined(),
    );

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

  it("closes on Escape", async () => {
    const palette = renderComponent(<Palette perform={vi.fn()} />);

    palette.renderer.simulateKeystrokes("escape");

    await waitFor(() =>
      expect(palette.renderer.findByTestId("command-menu")).toBeUndefined(),
    );

    palette.unmount();
  });

  it("matches a non-contiguous query by initials", async () => {
    const perform = vi.fn();
    const palette = renderComponent(<Palette perform={perform} />);

    type(palette, "opfl");

    const texts = palette.renderer.getAllText();
    expect(texts).toContain("Open file");
    expect(texts).not.toContain("Open recent");
    await waitFor(() =>
      expect(palette.renderer.findByTestId("command-empty")).toBeUndefined(),
    );

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

  it("shows recent actions first under one heading for an empty query", () => {
    const palette = renderComponent(
      <Palette perform={vi.fn()} recents={["save", "sidebar"]} />,
    );

    const texts = palette.renderer.getAllText();
    const recent = texts.indexOf("Recent");
    const save = texts.indexOf("Save");
    const sidebar = texts.indexOf("Toggle sidebar");
    const navigation = texts.indexOf("Navigation");

    expect(recent).toBeGreaterThanOrEqual(0);
    expect(save).toBeGreaterThan(recent);
    expect(sidebar).toBeGreaterThan(save);
    expect(navigation).toBeGreaterThan(sidebar);
    expect(texts.filter((text) => text === "Save")).toHaveLength(1);
    expect(texts.filter((text) => text === "Recent")).toHaveLength(1);

    // The first recent row is the highlight, so Enter runs it.
    expect(
      palette.renderer.findByTestId("command-save")?.customProps?.[
        "aria-selected"
      ],
    ).toBe(true);

    palette.unmount();
  });

  it("drops unknown and repeated recent ids", () => {
    const palette = renderComponent(
      <Palette perform={vi.fn()} recents={["nope", "save", "save"]} />,
    );

    const texts = palette.renderer.getAllText();
    expect(texts.filter((text) => text === "Save")).toHaveLength(1);
    expect(texts).not.toContain("nope");
    expect(texts).toContain("Open file");
    expect(texts).toContain("Toggle sidebar");

    palette.unmount();
  });

  it("ignores recents once a query is typed", () => {
    const palette = renderComponent(
      <Palette perform={vi.fn()} recents={["sidebar"]} />,
    );

    type(palette, "sa");

    const texts = palette.renderer.getAllText();
    expect(texts).not.toContain("Recent");
    expect(texts).toContain("Save");
    expect(texts).not.toContain("Export as PDF");

    palette.unmount();
  });

  it("runs a recent row once and closes", async () => {
    const perform = vi.fn();
    const palette = renderComponent(
      <Palette perform={perform} recents={["save"]} />,
    );

    clickCentreOf(palette, "command-save");

    expect(perform).toHaveBeenCalledTimes(1);
    expect(perform).toHaveBeenCalledWith("save");
    await waitFor(() =>
      expect(palette.renderer.findByTestId("command-menu")).toBeUndefined(),
    );

    palette.unmount();
  });

  it("renders the caller's own empty state", () => {
    const CustomEmpty = () => {
      const [open, setOpen] = useState(true);
      return (
        <CommandMenu
          open={open}
          onOpenChange={setOpen}
          actions={actions(vi.fn())}
        >
          <CommandMenuInput />
          <CommandMenuList />
          <CommandMenuEmpty>Nothing here</CommandMenuEmpty>
        </CommandMenu>
      );
    };
    const palette = renderComponent(<CustomEmpty />);

    type(palette, "zzz");

    expect(palette.renderer.getAllText()).toContain("Nothing here");
    expect(palette.renderer.getAllText()).not.toContain("No matching commands");

    palette.unmount();
  });

  it("paints the part's placeholder as its hint and takes its name", () => {
    const Named = () => {
      const [open, setOpen] = useState(true);
      return (
        <CommandMenu
          open={open}
          onOpenChange={setOpen}
          actions={actions(vi.fn())}
        >
          <CommandMenuInput placeholder="Find a command" label="Find" />
          <CommandMenuList />
          <CommandMenuEmpty />
        </CommandMenu>
      );
    };
    const palette = renderComponent(<Named />);
    const input = palette.renderer.findByTestId("command-input");

    // The host is handed no placeholder: the runtime shapes it in a fixed grey
    // no token reaches, so the field paints the hint in the measured role.
    expect(input?.customProps?.placeholder).toBeUndefined();
    expect(input?.customProps?.["aria-label"]).toBe("Find");
    const hint = palette.renderer.findByTestId("command-input-hint");
    expect(hint?.style.color).toBe(darkTheme.colors.placeholder);
    expect(palette.renderer.getAllText()).toContain("Find a command");

    palette.unmount();
  });
});
