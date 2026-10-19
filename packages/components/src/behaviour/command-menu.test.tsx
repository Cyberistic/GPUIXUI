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

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  finishMotion,
  clickCentreOf,
  focusedTestId,
  isShown,
  requireBounds,
  until,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import {
  CommandMenu,
  CommandMenuEmpty,
  CommandMenuInput,
  CommandMenuItem,
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
    >
      <CommandMenuInput />
      <CommandMenuList />
      <CommandMenuEmpty />
    </CommandMenu>
  );
};

/** Type one character into whatever holds focus. */
const type = (root: ReturnType<typeof renderComponent>, text: string): void => {
  text.split("").forEach((key) => root.renderer.simulateKeystrokes(key));
};

/** A palette with a visible reopen control, so recents can be observed. */
const ReopenablePalette = ({
  perform,
  recent,
  defaultRecent,
  onRecentChange,
  recentLimit,
  defaultOpen = true,
}: {
  readonly perform: (id: string) => void;
  readonly recent?: ReadonlyArray<string>;
  readonly defaultRecent?: ReadonlyArray<string>;
  readonly onRecentChange?: (recent: ReadonlyArray<string>) => void;
  readonly recentLimit?: number;
  readonly defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ width: 640, height: 640 }}>
      <div
        role="button"
        tabIndex={0}
        testId="open-palette"
        onClick={() => setOpen(true)}
        style={{ width: 140, height: 32 }}
      >
        Open palette
      </div>
      <CommandMenu
        open={open}
        onOpenChange={setOpen}
        actions={actions(perform)}
        recent={recent}
        defaultRecent={defaultRecent}
        onRecentChange={onRecentChange}
        recentLimit={recentLimit}
      >
        <CommandMenuInput />
        <CommandMenuList />
        <CommandMenuEmpty />
      </CommandMenu>
    </div>
  );
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
    finishMotion(palette);
    expect(palette.renderer.findByTestId("command-menu")).toBeUndefined();

    palette.unmount();
  });

  it("runs a clicked row", () => {
    const perform = vi.fn();
    const palette = renderComponent(<Palette perform={perform} />);

    clickCentreOf(palette, "command-save");

    expect(perform).toHaveBeenCalledWith("save");
    finishMotion(palette);
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

    finishMotion(palette);
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

  it("takes the input's placeholder and name from the part", () => {
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

    expect(input?.customProps?.placeholder).toBe("Find a command");
    expect(input?.customProps?.["aria-label"]).toBe("Find");

    palette.unmount();
  });

  it("shows a run command first when the palette reopens", async () => {
    const perform = vi.fn();
    const onRecentChange = vi.fn();
    const palette = renderComponent(
      <ReopenablePalette perform={perform} onRecentChange={onRecentChange} />,
    );

    palette.renderer.simulateKeystrokes("enter");
    await Promise.resolve();
    expect(perform).toHaveBeenCalledWith("open-file");
    finishMotion(palette);
    expect(palette.renderer.findByTestId("command-menu")).toBeUndefined();
    expect(onRecentChange).toHaveBeenCalledWith(["open-file"]);

    clickCentreOf(palette, "open-palette");
    await Promise.resolve();

    expect(palette.renderer.getAllText()).toContain("Recent");
    const recent = requireBounds(palette, "command-open-file");
    const next = requireBounds(palette, "command-open-recent");
    expect(recent.y).toBeLessThan(next.y);

    palette.unmount();
  });

  it("keeps recency order and does not duplicate a command", async () => {
    const perform = vi.fn();
    const palette = renderComponent(<ReopenablePalette perform={perform} />);

    palette.renderer.simulateKeystrokes("enter");
    await Promise.resolve();
    finishMotion(palette);
    clickCentreOf(palette, "open-palette");
    await until(() => isShown(palette, "command-open-file"));

    type(palette, "save");
    palette.renderer.simulateKeystrokes("enter");
    await Promise.resolve();
    finishMotion(palette);
    clickCentreOf(palette, "open-palette");
    await until(() => isShown(palette, "command-open-file"));

    const save = requireBounds(palette, "command-save");
    const open = requireBounds(palette, "command-open-file");
    expect(save.y).toBeLessThan(open.y);
    expect(
      palette.renderer.getAllText().filter((text) => text === "Save"),
    ).toHaveLength(1);

    palette.unmount();
  });

  it("takes its initial list from defaultRecent", () => {
    const palette = renderComponent(
      <ReopenablePalette perform={vi.fn()} defaultRecent={["sidebar"]} />,
    );

    expect(palette.renderer.getAllText()).toContain("Recent");
    const recent = requireBounds(palette, "command-sidebar");
    const first = requireBounds(palette, "command-open-file");
    expect(recent.y).toBeLessThan(first.y);

    palette.unmount();
  });

  it("records a run command when the recent limit is not a number", async () => {
    const onRecentChange = vi.fn();
    const palette = renderComponent(
      <ReopenablePalette
        perform={vi.fn()}
        recentLimit={Number.NaN}
        onRecentChange={onRecentChange}
      />,
    );

    palette.renderer.simulateKeystrokes("enter");
    await Promise.resolve();

    // A malformed cap is no cap, not "keep nothing".
    expect(onRecentChange).toHaveBeenCalledWith(["open-file"]);

    finishMotion(palette);
    clickCentreOf(palette, "open-palette");
    await until(() => isShown(palette, "command-open-file"));

    expect(palette.renderer.getAllText()).toContain("Recent");

    palette.unmount();
  });

  it("ranks normally while a query is typed", () => {
    const palette = renderComponent(
      <ReopenablePalette perform={vi.fn()} defaultRecent={["sidebar"]} />,
    );

    type(palette, "op");

    const texts = palette.renderer.getAllText();
    expect(texts).not.toContain("Recent");
    expect(texts.filter((text) => text === "Open file")).toHaveLength(1);
    expect(texts).toContain("Open recent");

    palette.unmount();
  });

  it("reports the next list without moving a controlled order", async () => {
    const onRecentChange = vi.fn();
    const palette = renderComponent(
      <ReopenablePalette
        perform={vi.fn()}
        recent={["sidebar"]}
        onRecentChange={onRecentChange}
      />,
    );

    clickCentreOf(palette, "command-open-file");
    await Promise.resolve();

    expect(onRecentChange).toHaveBeenCalledWith(["open-file", "sidebar"]);

    finishMotion(palette);
    clickCentreOf(palette, "open-palette");
    await until(() => isShown(palette, "command-sidebar"));

    const sidebar = requireBounds(palette, "command-sidebar");
    const open = requireBounds(palette, "command-open-file");
    expect(sidebar.y).toBeLessThan(open.y);

    palette.unmount();
  });

  /** Thirty rows, so the list overflows its 320 px viewport. */
  const overflowActions = (): ReadonlyArray<CommandAction> =>
    Array.from({ length: 30 }, (_, index) => ({
      id: `action-${index + 1}`,
      label: `Action ${index + 1}`,
      perform: () => undefined,
    }));

  /**
   * The bug this guards (plan 530): 30 actions, 24 ArrowDown presses — the
   * highlight sat 160 px below the 320 px list, and Enter still ran it. The
   * scroll container is named so a suite can measure the viewport by testId.
   */
  it("keeps the highlighted row inside the list viewport", () => {
    const palette = renderComponent(<LocalPalette items={overflowActions()} />);
    Arr.forEach(Arr.range(1, 24), () =>
      palette.renderer.simulateKeystrokes("down"),
    );
    palette.renderer.flush();

    const list = requireBounds(palette, "command-list");
    const row = requireBounds(palette, "command-action-25");
    expect(row.y).toBeGreaterThanOrEqual(list.y);
    expect(row.y + row.height).toBeLessThanOrEqual(list.y + list.height);

    const scroll = palette.renderer.getScrollOffset(
      palette.renderer.findByTestId("command-list")?.id ?? -1,
    );
    expect(scroll?.[1] ?? 0).toBeLessThan(0);

    palette.unmount();
  });

  it("returns the list to the top when the highlight moves back up", () => {
    const palette = renderComponent(<LocalPalette items={overflowActions()} />);
    Arr.forEach(Arr.range(1, 24), () =>
      palette.renderer.simulateKeystrokes("down"),
    );
    // Put the list further down than the highlight needs, as a wheel scroll
    // would, so only the reveal can bring the first row back.
    palette.renderer.scrollTo(
      palette.renderer.findByTestId("command-list")?.id ?? -1,
      0,
      -400,
    );
    palette.renderer.flush();

    Arr.forEach(Arr.range(1, 24), () =>
      palette.renderer.simulateKeystrokes("up"),
    );
    palette.renderer.flush();

    const list = requireBounds(palette, "command-list");
    const first = requireBounds(palette, "command-action-1");
    expect(first.y).toBeGreaterThanOrEqual(list.y);
    expect(first.y).toBeLessThan(list.y + list.height);

    const scroll = palette.renderer.getScrollOffset(
      palette.renderer.findByTestId("command-list")?.id ?? -1,
    );
    expect(scroll?.[1] ?? 0).toBe(0);

    palette.unmount();
  });

  it("composes the caller's click with the command it runs", () => {
    const perform = vi.fn();
    const onClick = vi.fn();
    const action: CommandAction = {
      id: "open-file",
      label: "Open file",
      perform: () => perform("open-file"),
    };
    // A caller-composed list is a wrapper under the root; `CommandMenuItem` is
    // the exported row for exactly this case.
    const CustomList = () => (
      <div>
        <CommandMenuItem action={action} onClick={onClick} />
      </div>
    );
    const palette = renderComponent(
      <CommandMenu open onOpenChange={() => undefined} actions={[action]}>
        <CustomList />
      </CommandMenu>,
    );

    clickCentreOf(palette, "command-open-file");

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(perform).toHaveBeenCalledWith("open-file");

    palette.unmount();
  });

  /**
   * Focus visibility (plan 523). The bug this guards, measured: the palette
   * autoFocuses its field, the runtime focuses it after React's effects, and the
   * field painted no ring — so the surface the user typed into was invisible.
   */
  it("paints the focus ring on the search field", () => {
    const palette = renderComponent(<Palette perform={() => undefined} />);

    expect(focusedTestId(palette)).toEqual(Option.some("command-input"));
    expect(
      palette.renderer.findByTestId("command-input")?.style.boxShadow,
    ).toBeDefined();

    palette.unmount();
  });

  /**
   * The bug this guards (plans 581/589), measured in a real window: closing the
   * palette left `focused = none`. `CommandMenuInput`'s `autoFocus` took native
   * focus in the same commit, before `useModalFocus` recorded the opener, so the
   * saved id was the field being destroyed. The dialog's `initialFocus` already
   * focuses the field; the field must not claim focus before the opener is read.
   */
  it("returns focus to the control that opened it", () => {
    const palette = renderComponent(
      <ReopenablePalette perform={vi.fn()} defaultOpen={false} />,
    );

    // A press does not focus a plain div in 0.10.0, so pin the precondition.
    palette.renderer.focusElement(
      palette.renderer.findByTestId("open-palette")?.id ?? -1,
    );
    clickCentreOf(palette, "open-palette");
    expect(focusedTestId(palette)).toEqual(Option.some("command-input"));

    palette.renderer.simulateKeystrokes("escape");
    finishMotion(palette);

    expect(focusedTestId(palette)).toEqual(Option.some("open-palette"));

    // Running a command is the path the playground measured (`Enter` closes
    // through the same `onOpenChange(false)`).
    clickCentreOf(palette, "open-palette");
    expect(focusedTestId(palette)).toEqual(Option.some("command-input"));
    palette.renderer.simulateKeystrokes("enter");
    finishMotion(palette);

    expect(focusedTestId(palette)).toEqual(Option.some("open-palette"));

    palette.unmount();
  });
});
