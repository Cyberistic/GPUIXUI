/**
 * Combobox behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a popup that opens without focusing its search field; a
 * filter that hides matches; a selection that reports the label instead of the
 * value; a single select that does not replace the previous value; a multi select
 * that loses order or duplicates; a disabled option that can still be chosen; an
 * empty state that never appears; a ranking that puts `Vacation` before
 * `Calendar`; and Escape that does not return focus to the trigger.
 *
 * Pointer coverage: the suite originally drove every selection from the
 * keyboard, so a wrapper that ignored a clicked option, kept the popup open, or
 * let a disabled option through would have passed.
 *
 * Grouping (plan 395): a global sort could pull a later group's better match
 * above an earlier group and split its heading; a missing heading hid the
 * sections the caller declared; and a create row that inherited the previous
 * group's heading looked like a real option of that group.
 *
 * Dismissal (plan 398): the popup did not participate in the dismiss stack, so
 * one Escape or one backdrop press closed the popup **and** the dialog around
 * it, and pressing the trigger closed the popup only for the click that follows
 * to re-open it.
 */

import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import { nodesWithRole, type A11yNode } from "../internal/a11y.js";
import {
  finishMotion,
  clickCentreOf,
  focusedTestId,
  requireBounds,
} from "../internal/interaction.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
  type TestTheme,
} from "../internal/test-root.js";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxList,
  ComboboxTrigger,
  type ComboboxOption,
} from "../combobox.js";
import { Dialog, DialogContent, DialogTitle } from "../dialog.js";

const options: ReadonlyArray<ComboboxOption> = [
  { value: "calendar", label: "Calendar", description: "Scheduling" },
  { value: "camera", label: "Camera", description: "Hardware" },
  { value: "vacation", label: "Vacation", description: "Time off" },
  { value: "desk", label: "Desk booking", description: "Workspace" },
];

/** Two runs: the `Devices` prefix match must not jump ahead of `Work`. */
const groupedOptions: ReadonlyArray<ComboboxOption> = [
  { value: "vacation", label: "Vacation", group: "Work" },
  { value: "calendar", label: "Calendar", group: "Work" },
  { value: "camera", label: "Camera roll", group: "Devices" },
  { value: "desk", label: "Desk booking", group: "Devices" },
];

const Picker = ({
  onValueChange,
  multiple,
  disabledCamera,
  empty,
  triggerPlaceholder,
  triggerLabel = "Assign reviewer",
  onCreate,
  createLabel,
  onQueryChange,
  debounce,
  shouldFilter,
  loading,
  optionList,
}: {
  readonly onValueChange?: (
    value: string | null | ReadonlyArray<string>,
  ) => void;
  readonly multiple?: boolean;
  readonly disabledCamera?: boolean;
  readonly empty?: string;
  readonly triggerPlaceholder?: string;
  readonly triggerLabel?: string;
  readonly onCreate?: (query: string) => void;
  readonly createLabel?: (query: string) => string;
  readonly onQueryChange?: (query: string) => void;
  readonly debounce?: number;
  readonly shouldFilter?: boolean;
  readonly loading?: boolean;
  readonly optionList?: ReadonlyArray<ComboboxOption>;
}) => (
  <div style={{ width: 360, padding: 40 }}>
    <Combobox
      onCreate={onCreate}
      createLabel={createLabel}
      onQueryChange={onQueryChange}
      debounce={debounce}
      shouldFilter={shouldFilter}
      loading={loading}
      options={
        disabledCamera === true
          ? (optionList ?? options).map((option) =>
              option.value === "camera"
                ? { ...option, disabled: true }
                : option,
            )
          : (optionList ?? options)
      }
      multiple={multiple}
      onValueChange={onValueChange}
    >
      <ComboboxTrigger
        label={triggerLabel}
        {...(triggerPlaceholder === undefined
          ? {}
          : { placeholder: triggerPlaceholder })}
      />
      <ComboboxContent>
        <ComboboxInput label="Search reviewers" />
        <ComboboxList label="Reviewers" />
        <ComboboxEmpty>{empty}</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  </div>
);

/** The directory a remote picker searches; the caller owns the filtering. */
const directory: ReadonlyArray<ComboboxOption> = [
  { value: "ada", label: "Ada Lovelace" },
  { value: "grace", label: "Grace Hopper" },
  { value: "vacation", label: "Vacation cover" },
  { value: "alan", label: "Alan Turing" },
];

/** Filter the directory the way a server would, on every reported query. */
const searchDirectory = (query: string): ReadonlyArray<ComboboxOption> => {
  const needle = query.trim().toLowerCase();
  return needle === ""
    ? directory
    : directory.filter((entry) => entry.label.toLowerCase().includes(needle));
};

/** A picker whose rows are the caller's search result, not the wrapper's. */
const RemotePicker = ({
  onQueryChange,
}: {
  readonly onQueryChange?: (query: string) => void;
}) => {
  const [rows, setRows] = useState<ReadonlyArray<ComboboxOption>>(directory);

  return (
    <Picker
      optionList={rows}
      shouldFilter={false}
      onQueryChange={(query) => {
        onQueryChange?.(query);
        setRows(searchDirectory(query));
      }}
    />
  );
};

/** Nothing to show yet: the empty slot is the loading message. */
const LoadingPicker = ({ loading }: { readonly loading: boolean }) => (
  <Picker optionList={[]} loading={loading} />
);

/** A trigger near the window centre, where a centred popup has room to sit. */
const CentredPicker = ({
  align = "center",
}: {
  readonly align?: "start" | "center";
}) => (
  <div style={{ paddingLeft: 540, paddingTop: 100 }}>
    <Combobox options={options}>
      <ComboboxTrigger label="Assign reviewer" />
      <ComboboxContent align={align}>
        <ComboboxInput label="Search reviewers" />
        <ComboboxList label="Reviewers" />
      </ComboboxContent>
    </Combobox>
  </div>
);

/** A trigger at the bottom of the window, where a downside popup cannot fit. */
const LowPicker = () => (
  <div style={{ display: "flex", flexDirection: "column", height: 780 }}>
    <div style={{ flexGrow: 1 }} />
    <Combobox options={options}>
      <ComboboxTrigger label="Assign reviewer" />
      <ComboboxContent>
        <ComboboxInput label="Search reviewers" />
        <ComboboxList label="Reviewers" />
      </ComboboxContent>
    </Combobox>
  </div>
);

/** A run of options long enough to overflow the popup. */
const overflowOptions = (count: number): ReadonlyArray<ComboboxOption> =>
  Arr.map(Arr.range(1, count), (index) => ({
    value: `option-${index}`,
    label: `Option ${index}`,
  }));

const OverflowPicker = ({
  options: rows = overflowOptions(30),
}: {
  readonly options?: ReadonlyArray<ComboboxOption>;
}) => (
  <div style={{ width: 360, padding: 40 }}>
    <Combobox options={rows}>
      <ComboboxTrigger label="Pick an option" />
      <ComboboxContent>
        <ComboboxInput label="Search options" />
        <ComboboxList label="Options" />
      </ComboboxContent>
    </Combobox>
  </div>
);

/** A combobox inside an open dialog: one event must close one surface. */
const DialogPicker = () => {
  const [open, setOpen] = useState(true);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent label="Assign reviewer" testId="dialog">
        <DialogTitle>Assign reviewer</DialogTitle>
        <Combobox options={options}>
          <ComboboxTrigger testId="dialog-combo" label="Assign reviewer" />
          <ComboboxContent>
            <ComboboxInput label="Search reviewers" />
            <ComboboxList label="Reviewers" />
          </ComboboxContent>
        </Combobox>
      </DialogContent>
    </Dialog>
  );
};

/** Let the runtime's microtask (focus) and React's updates settle. */
const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

/** Wait past a debounce window on the real clock (the suite has no fake timers). */
const wait = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

/** Open the dialog's combobox, then settle. */
const openInDialog = async (root: ComponentTestRoot): Promise<void> => {
  clickCentreOf(root, "dialog-combo");
  await settle();
};

/** Open the popup and wait for its input. */
const open = async (root: ComponentTestRoot): Promise<void> => {
  clickCentreOf(root, "combobox-trigger");
  await settle();
};

/** Type into the focused search field. */
const type = (root: ComponentTestRoot, text: string): void => {
  text.split("").forEach((key) => root.renderer.simulateKeystrokes(key));
};

describe("Combobox", () => {
  it("opens the popup and focuses the search input", async () => {
    const picker = renderComponent(<Picker />);

    await open(picker);

    expect(picker.renderer.findByTestId("combobox-content")).toBeDefined();
    expect(focusedTestId(picker)).toEqual(Option.some("combobox-input"));

    picker.unmount();
  });

  /**
   * The surface must be centred on the trigger. The runtime anchors `start` to
   * the trigger's layout edge, so a centre request adds half the width
   * difference; asserted as a shift, because the rebuilt binding reports each
   * element's content-box origin (its padding inset cancels between the two
   * surfaces, but not between the trigger and the surface — plan 536).
   */
  it("centres a requested popup on its trigger", async () => {
    const start = renderComponent(<CentredPicker align="start" />);
    await open(start);
    const trigger = requireBounds(start, "combobox-trigger");
    const startSurface = requireBounds(start, "combobox-content");
    start.unmount();

    const centred = renderComponent(<CentredPicker align="center" />);
    await open(centred);
    const surface = requireBounds(centred, "combobox-content");
    centred.unmount();

    expect(surface.width).toBe(startSurface.width);
    expect(
      Math.abs(
        surface.x - startSurface.x - (trigger.width - surface.width) / 2,
      ),
    ).toBeLessThanOrEqual(1);
  });

  it("opens above a trigger near the window bottom instead of covering it", async () => {
    const picker = renderComponent(<LowPicker />);

    await open(picker);

    const trigger = requireBounds(picker, "combobox-trigger");
    const surface = requireBounds(picker, "combobox-content");

    expect(surface.y + surface.height).toBeLessThanOrEqual(trigger.y);

    picker.unmount();
  });

  it("filters the rows as the query is typed", async () => {
    const picker = renderComponent(<Picker />);
    await open(picker);

    type(picker, "ca");
    await settle();

    const texts = picker.renderer.getAllText();
    expect(texts).toContain("Calendar");
    expect(texts).toContain("Camera");
    expect(texts).toContain("Vacation");
    expect(texts).not.toContain("Desk booking");

    picker.unmount();
  });

  it("selects the second match with ArrowDown and Enter, by value", async () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(<Picker onValueChange={onValueChange} />);
    await open(picker);

    type(picker, "ca");
    await settle();
    picker.renderer.simulateKeystrokes("down");
    picker.renderer.simulateKeystrokes("enter");
    await settle();

    expect(onValueChange).toHaveBeenCalledWith("camera");
    expect(picker.renderer.getAllText()).toContain("Camera");

    picker.unmount();
  });

  it("shows the empty label when nothing matches", async () => {
    const picker = renderComponent(<Picker />);
    await open(picker);

    type(picker, "zzz");
    await settle();

    expect(picker.renderer.findByTestId("combobox-empty")).toBeDefined();
    expect(picker.renderer.getAllText()).toContain("No matches");

    picker.unmount();
  });

  it("replaces the value in single mode", async () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(<Picker onValueChange={onValueChange} />);

    await open(picker);
    type(picker, "ca");
    await settle();
    clickCentreOf(picker, "combobox-option-calendar");
    await settle();

    await open(picker);
    type(picker, "ca");
    await settle();
    expect(
      picker.renderer.findByTestId("combobox-option-calendar")?.customProps?.[
        "aria-selected"
      ],
    ).toBe(true);
    expect(
      picker.renderer.findByTestId("combobox-option-camera")?.customProps?.[
        "aria-selected"
      ],
    ).toBe(false);
    expect(picker.renderer.findByType("svg")).toHaveLength(2);
    clickCentreOf(picker, "combobox-option-camera");
    await settle();

    expect(onValueChange.mock.calls.at(-1)).toEqual(["camera"]);
    expect(picker.renderer.getAllText()).toContain("Camera");

    picker.unmount();
  });

  it("adds and removes in multiple mode, preserving selection order", async () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <Picker multiple onValueChange={onValueChange} />,
    );
    await open(picker);

    clickCentreOf(picker, "combobox-option-calendar");
    await settle();
    clickCentreOf(picker, "combobox-option-camera");
    await settle();
    clickCentreOf(picker, "combobox-option-calendar");
    await settle();

    expect(onValueChange.mock.calls).toEqual([
      [["calendar"]],
      [["calendar", "camera"]],
      [["camera"]],
    ]);

    picker.unmount();
  });

  it("shows a disabled option but does not select it", async () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <Picker disabledCamera onValueChange={onValueChange} />,
    );
    await open(picker);

    expect(picker.renderer.getAllText()).toContain("Camera");

    clickCentreOf(picker, "combobox-option-camera");
    await settle();

    expect(onValueChange).not.toHaveBeenCalled();
    expect(picker.renderer.findByTestId("combobox-content")).toBeDefined();

    picker.unmount();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const picker = renderComponent(<Picker />);
    await open(picker);

    picker.renderer.simulateKeystrokes("escape");
    await settle();

    expect(picker.renderer.findByTestId("combobox-content")).toBeUndefined();
    expect(focusedTestId(picker)).toEqual(Option.some("combobox-trigger"));

    picker.unmount();
  });

  it("closes on a second trigger press without re-opening", async () => {
    const picker = renderComponent(<Picker />);
    await open(picker);

    clickCentreOf(picker, "combobox-trigger");
    await settle();

    expect(picker.renderer.findByTestId("combobox-content")).toBeUndefined();

    // A separate press is a new gesture and opens it again.
    clickCentreOf(picker, "combobox-trigger");
    await settle();

    expect(picker.renderer.findByTestId("combobox-content")).toBeDefined();

    picker.unmount();
  });

  it("closes one surface per Escape inside a dialog", async () => {
    const nested = renderComponent(<DialogPicker />);
    await openInDialog(nested);

    expect(nested.renderer.findByTestId("combobox-content")).toBeDefined();

    nested.renderer.simulateKeystrokes("escape");
    await settle();

    expect(nested.renderer.findByTestId("combobox-content")).toBeUndefined();
    expect(nested.renderer.findByTestId("dialog")).toBeDefined();

    nested.renderer.simulateKeystrokes("escape");
    await settle();

    finishMotion(nested);
    expect(nested.renderer.findByTestId("dialog")).toBeUndefined();

    nested.unmount();
  });

  it("closes one surface per backdrop press inside a dialog", async () => {
    const nested = renderComponent(<DialogPicker />);
    await openInDialog(nested);

    nested.renderer.nativeSimulateClick(12, 12);
    await settle();

    expect(nested.renderer.findByTestId("combobox-content")).toBeUndefined();
    expect(nested.renderer.findByTestId("dialog")).toBeDefined();

    nested.renderer.nativeSimulateClick(12, 12);
    await settle();

    finishMotion(nested);
    expect(nested.renderer.findByTestId("dialog")).toBeUndefined();

    nested.unmount();
  });

  it("ranks a prefix match above a substring match", async () => {
    const picker = renderComponent(<Picker />);
    await open(picker);

    type(picker, "ca");
    await settle();

    const texts = picker.renderer.getAllText();
    expect(texts.indexOf("Calendar")).toBeLessThan(texts.indexOf("Vacation"));
    expect(texts.indexOf("Camera")).toBeLessThan(texts.indexOf("Vacation"));

    picker.unmount();
  });

  it("paints the popup from whichever theme is active", async () => {
    const assertTheme = async (
      theme: TestTheme,
      popover: string,
    ): Promise<void> => {
      const picker = renderComponent(<Picker />, theme);
      await open(picker);

      expect(
        picker.renderer.findByTestId("combobox-content")?.style.backgroundColor,
      ).toBe(popover);

      picker.unmount();
    };

    await assertTheme("dark", darkTheme.colors.popover);
    await assertTheme("light", lightTheme.colors.popover);
  });

  it("selects an option with the pointer", async () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(<Picker onValueChange={onValueChange} />);
    await open(picker);

    clickCentreOf(picker, "combobox-option-camera");
    await settle();

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("camera");
    expect(picker.renderer.findByTestId("combobox-content")).toBeUndefined();
    expect(
      picker.renderer.findByTestId("combobox-trigger")?.customProps?.[
        "aria-expanded"
      ],
    ).toBe(false);
    expect(picker.renderer.getAllText()).toContain("Camera");

    picker.unmount();
  });

  it("toggles several options with the pointer and skips a disabled one", async () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <Picker multiple disabledCamera onValueChange={onValueChange} />,
    );
    await open(picker);

    clickCentreOf(picker, "combobox-option-calendar");
    clickCentreOf(picker, "combobox-option-camera");
    clickCentreOf(picker, "combobox-option-vacation");
    clickCentreOf(picker, "combobox-option-calendar");
    await settle();

    expect(onValueChange.mock.calls).toEqual([
      [["calendar"]],
      [["calendar", "vacation"]],
      [["vacation"]],
    ]);
    expect(picker.renderer.findByTestId("combobox-content")).toBeDefined();

    picker.unmount();
  });

  it("closes on an outside press", async () => {
    const picker = renderComponent(
      <div style={{ width: 1280, height: 800, position: "relative" }}>
        <Picker />
        <div
          testId="elsewhere"
          style={{
            position: "absolute",
            right: 16,
            bottom: 16,
            width: 80,
            height: 40,
          }}
        >
          <text>Elsewhere</text>
        </div>
      </div>,
    );
    await open(picker);

    clickCentreOf(picker, "elsewhere");
    await settle();

    expect(picker.renderer.findByTestId("combobox-content")).toBeUndefined();

    picker.unmount();
  });

  it("renders the caller's own empty state", async () => {
    const picker = renderComponent(<Picker empty="No fruit found" />);
    await open(picker);

    type(picker, "zzz");
    await settle();

    expect(picker.renderer.getAllText()).toContain("No fruit found");
    expect(picker.renderer.getAllText()).not.toContain("No matches");

    picker.unmount();
  });

  it("takes the trigger's placeholder and name from the part", () => {
    const picker = renderComponent(
      <Picker triggerPlaceholder="Pick a reviewer" triggerLabel="Reviewer" />,
    );

    expect(picker.renderer.getAllText()).toContain("Pick a reviewer");
    expect(
      picker.renderer.findByTestId("combobox-trigger")?.customProps?.[
        "aria-label"
      ],
    ).toBe("Reviewer");

    picker.unmount();
  });

  it("offers a create row after the ranked matches", async () => {
    const picker = renderComponent(<Picker onCreate={() => {}} />);
    await open(picker);

    type(picker, "Des");
    await settle();

    const match = requireBounds(picker, "combobox-option-desk");
    const create = requireBounds(picker, "combobox-option-create");
    expect(create.y).toBeGreaterThan(match.y);
    expect(picker.renderer.getAllText()).toContain("Create “Des”");

    picker.unmount();
  });

  it("creates the typed value with Enter and reports it once", async () => {
    const onCreate = vi.fn();
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <Picker onCreate={onCreate} onValueChange={onValueChange} />,
    );
    await open(picker);

    type(picker, "Design");
    await settle();
    picker.renderer.simulateKeystrokes("enter");
    await settle();

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith("Design");
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("Design");
    expect(picker.renderer.findByTestId("combobox-content")).toBeUndefined();
    expect(picker.renderer.getAllText()).toContain("Design");
    expect(focusedTestId(picker)).toEqual(Option.some("combobox-trigger"));

    picker.unmount();
  });

  it("does not offer creation for an existing option", async () => {
    const picker = renderComponent(<Picker onCreate={() => {}} />);
    await open(picker);

    type(picker, "calendar");
    await settle();

    expect(
      picker.renderer.findByTestId("combobox-option-create"),
    ).toBeUndefined();
    expect(picker.renderer.getAllText()).not.toContain("Create “calendar”");

    picker.unmount();
  });

  it("creates in multiple mode without storing the sentinel", async () => {
    const onCreate = vi.fn();
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <Picker multiple onCreate={onCreate} onValueChange={onValueChange} />,
    );
    await open(picker);

    type(picker, "cal");
    await settle();
    picker.renderer.simulateKeystrokes("enter");
    await settle();
    expect(onValueChange.mock.calls).toEqual([[["calendar"]]]);
    type(picker, "Design");
    await settle();
    expect(
      picker.renderer.findByTestId("combobox-option-create"),
    ).toBeDefined();
    expect(focusedTestId(picker)).toEqual(Option.some("combobox-input"));
    picker.renderer.simulateKeystrokes("enter");
    await settle();

    expect(onCreate).toHaveBeenCalledWith("Design");
    expect(onValueChange.mock.calls.at(-1)).toEqual([["calendar", "Design"]]);
    expect(picker.renderer.findByTestId("combobox-content")).toBeDefined();
    expect(
      picker.renderer.findByTestId("combobox-option-create"),
    ).toBeUndefined();

    picker.unmount();
  });

  it("creates from a pointer press", async () => {
    const onCreate = vi.fn();
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <Picker onCreate={onCreate} onValueChange={onValueChange} />,
    );
    await open(picker);

    type(picker, "Design");
    await settle();
    clickCentreOf(picker, "combobox-option-create");
    await settle();

    expect(onCreate).toHaveBeenCalledWith("Design");
    expect(onValueChange).toHaveBeenCalledWith("Design");
    expect(picker.renderer.findByTestId("combobox-content")).toBeUndefined();
    expect(focusedTestId(picker)).toEqual(Option.some("combobox-trigger"));

    picker.unmount();
  });

  it("takes the create row's text from createLabel", async () => {
    const picker = renderComponent(
      <Picker
        onCreate={() => {}}
        createLabel={(query) => `Start “${query}”`}
      />,
    );
    await open(picker);

    type(picker, "Design");
    await settle();

    expect(picker.renderer.getAllText()).toContain("Start “Design”");
    expect(picker.renderer.getAllText()).not.toContain("Create “Design”");

    picker.unmount();
  });

  it("reports each typed query, not the label written on select", async () => {
    const onQueryChange = vi.fn();
    const picker = renderComponent(<Picker onQueryChange={onQueryChange} />);
    await open(picker);

    type(picker, "ca");
    await settle();
    picker.renderer.simulateKeystrokes("enter");
    await settle();

    expect(onQueryChange.mock.calls).toEqual([[""], ["c"], ["ca"]]);

    picker.unmount();
  });

  it("reports one query for a burst of edits when the caller debounces", async () => {
    const onQueryChange = vi.fn();
    const picker = renderComponent(
      <Picker onQueryChange={onQueryChange} debounce={120} />,
    );
    await open(picker);

    // Opening is not an edit: the empty query is reported at once, so a remote
    // source can start loading before the user has typed.
    expect(onQueryChange.mock.calls).toEqual([[""]]);

    type(picker, "ca");
    await settle();
    // Inside the window nothing is reported yet, or the debounce did nothing.
    expect(onQueryChange.mock.calls).toEqual([[""]]);

    await wait(200);
    expect(onQueryChange.mock.calls).toEqual([[""], ["ca"]]);

    picker.unmount();
  });

  it("drops a pending query when an option is chosen inside the window", async () => {
    const onQueryChange = vi.fn();
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <Picker
        onQueryChange={onQueryChange}
        onValueChange={onValueChange}
        debounce={120}
      />,
    );
    await open(picker);

    type(picker, "ca");
    await settle();
    picker.renderer.simulateKeystrokes("enter");
    await settle();
    await wait(200);

    // The selection's label write is not a query, and the abandoned edit must
    // not reach the caller after the popup has closed.
    expect(onQueryChange.mock.calls).toEqual([[""]]);
    expect(onValueChange).toHaveBeenCalledWith("calendar");

    picker.unmount();
  });

  it("shows the caller's rows when filtering is off", async () => {
    const picker = renderComponent(<Picker shouldFilter={false} />);
    await open(picker);

    type(picker, "zzz");
    await settle();

    const texts = picker.renderer.getAllText();
    expect(texts).toContain("Calendar");
    expect(texts).toContain("Desk booking");
    expect(picker.renderer.findByTestId("combobox-empty")).toBeUndefined();

    picker.unmount();
  });

  it("lets a caller replace the options for a query", async () => {
    const picker = renderComponent(<RemotePicker />);
    await open(picker);

    type(picker, "vac");
    await settle();

    const texts = picker.renderer.getAllText();
    expect(texts).toContain("Vacation cover");
    expect(texts).not.toContain("Calendar");
    expect(texts).not.toContain("Ada Lovelace");

    picker.unmount();
  });

  it("exposes the trigger as a button with its expanded state", async () => {
    const picker = renderComponent(<Picker />);
    const named = (): ReadonlyArray<A11yNode> =>
      Arr.filter(
        nodesWithRole(picker.renderer, "button"),
        (node) => node.name === "Assign reviewer",
      );

    expect(Option.map(Arr.head(named()), (node) => node.expanded)).toEqual(
      Option.some(Option.some(false)),
    );

    await open(picker);

    expect(Option.map(Arr.head(named()), (node) => node.expanded)).toEqual(
      Option.some(Option.some(true)),
    );

    picker.unmount();
  });

  it("says Loading… instead of No matches while options are loading", async () => {
    const picker = renderComponent(<LoadingPicker loading />);
    await open(picker);

    expect(picker.renderer.getAllText()).toContain("Loading…");
    expect(picker.renderer.getAllText()).not.toContain("No matches");

    picker.rerender(<LoadingPicker loading={false} />);
    await settle();

    expect(picker.renderer.getAllText()).toContain("No matches");
    expect(picker.renderer.getAllText()).not.toContain("Loading…");

    picker.unmount();
  });

  it("renders one heading per contiguous group, in declaration order", async () => {
    const picker = renderComponent(<Picker optionList={groupedOptions} />);
    await open(picker);

    const texts = picker.renderer.getAllText();
    expect(Arr.filter(texts, (text) => text === "Work")).toHaveLength(1);
    expect(Arr.filter(texts, (text) => text === "Devices")).toHaveLength(1);
    expect(texts.indexOf("Work")).toBeLessThan(texts.indexOf("Vacation"));
    expect(texts.indexOf("Vacation")).toBeLessThan(texts.indexOf("Devices"));
    expect(texts.indexOf("Devices")).toBeLessThan(texts.indexOf("Camera roll"));

    const groups = nodesWithRole(picker.renderer, "group");
    expect(Arr.map(groups, (node) => node.name)).toEqual(["Work", "Devices"]);

    picker.unmount();
  });

  it("ranks inside a group, so a later group cannot jump the declaration order", async () => {
    const picker = renderComponent(<Picker optionList={groupedOptions} />);
    await open(picker);

    type(picker, "ca");
    await settle();

    const texts = picker.renderer.getAllText();
    expect(texts.indexOf("Calendar")).toBeLessThan(texts.indexOf("Vacation"));
    expect(texts.indexOf("Vacation")).toBeLessThan(
      texts.indexOf("Camera roll"),
    );
    expect(texts).not.toContain("Desk booking");
    expect(texts).toContain("Work");

    picker.unmount();
  });

  it("drops the heading of a group whose every option misses the query", async () => {
    const picker = renderComponent(<Picker optionList={groupedOptions} />);
    await open(picker);

    type(picker, "desk");
    await settle();

    const texts = picker.renderer.getAllText();
    expect(texts).toContain("Desk booking");
    expect(texts).not.toContain("Work");
    expect(texts).toContain("Devices");

    picker.unmount();
  });

  it("selects a grouped row by value and closes", async () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <Picker optionList={groupedOptions} onValueChange={onValueChange} />,
    );
    await open(picker);

    type(picker, "ca");
    await settle();
    picker.renderer.simulateKeystrokes("enter");
    await settle();

    expect(onValueChange).toHaveBeenCalledWith("calendar");
    expect(picker.renderer.findByTestId("combobox-content")).toBeUndefined();
    expect(picker.renderer.getAllText()).toContain("Calendar");

    picker.unmount();
  });

  it("keeps the create row ungrouped and after the last match", async () => {
    const onCreate = vi.fn();
    const picker = renderComponent(
      <Picker optionList={groupedOptions} onCreate={onCreate} />,
    );
    await open(picker);

    type(picker, "ca");
    await settle();

    const texts = picker.renderer.getAllText();
    expect(Arr.filter(texts, (text) => text === "Work")).toHaveLength(1);
    expect(texts.indexOf("Camera roll")).toBeLessThan(
      texts.indexOf("Create “ca”"),
    );

    // Calendar, Vacation, Camera roll, then the create row.
    picker.renderer.simulateKeystrokes("down");
    picker.renderer.simulateKeystrokes("down");
    picker.renderer.simulateKeystrokes("down");
    await settle();
    picker.renderer.simulateKeystrokes("enter");
    await settle();

    expect(onCreate).toHaveBeenCalledWith("ca");

    picker.unmount();
  });

  /**
   * Scrolling (plan 535). The bugs this guards, measured on this host: with 30
   * options and 24 `ArrowDown` presses the highlighted row sat at `y: 755`
   * against a list viewport ending at `351` — `Enter` selected a row the user
   * could not see. `scrollIntoView` under-scrolls here because the option is
   * nested in a group wrapper, and using the popup content as the scroll
   * container took the focused search field to `y: -360`. The list is now the
   * viewport, the field stays fixed, and the row is revealed by a measured
   * `scrollTo`.
   */
  it("keeps the highlighted option inside the list viewport", async () => {
    const picker = renderComponent(<OverflowPicker />);
    await open(picker);

    Arr.forEach(Arr.range(1, 24), () =>
      picker.renderer.simulateKeystrokes("down"),
    );
    picker.renderer.flush();

    const content = requireBounds(picker, "combobox-content");
    const row = requireBounds(picker, "combobox-option-option-24");
    expect(row.y).toBeGreaterThanOrEqual(content.y);
    expect(row.y + row.height).toBeLessThanOrEqual(content.y + content.height);

    const scroll = picker.renderer.getScrollOffset(
      picker.renderer.findByTestId("combobox-list")?.id ?? -1,
    );
    expect(scroll?.[1] ?? 0).toBeLessThan(0);

    // The field the user is typing into must not scroll away with the list, and
    // it must keep its control height rather than shrink to nothing.
    const input = requireBounds(picker, "combobox-input");
    expect(input.y).toBeGreaterThanOrEqual(content.y);
    expect(input.y + input.height).toBeLessThanOrEqual(row.y);
    expect(input.height).toBeGreaterThan(0);

    picker.unmount();
  });

  it("returns the list to the top when the highlight moves back up", async () => {
    // Twelve rows still overflow (12 × 28 > the 240 px list), and reaching the
    // first row from the last proves the upward reveal without 47 key presses.
    const picker = renderComponent(
      <OverflowPicker options={overflowOptions(12)} />,
    );
    await open(picker);
    // `ArrowUp` with no highlight wraps to the last row, which reveals the end.
    picker.renderer.simulateKeystrokes("up");
    picker.renderer.flush();

    const list = picker.renderer.findByTestId("combobox-list")?.id ?? -1;
    expect(picker.renderer.getScrollOffset(list)?.[1] ?? 0).toBeLessThan(0);

    Arr.forEach(Arr.range(1, 11), () =>
      picker.renderer.simulateKeystrokes("up"),
    );
    picker.renderer.flush();

    const content = requireBounds(picker, "combobox-content");
    const first = requireBounds(picker, "combobox-option-option-1");
    expect(first.y).toBeGreaterThanOrEqual(content.y);
    expect(first.y).toBeLessThan(content.y + content.height);
    expect(picker.renderer.getScrollOffset(list)?.[1] ?? null).toBeCloseTo(
      0,
      5,
    );

    picker.unmount();
  });

  /**
   * Focus visibility (plan 523). The bug this guards, measured: opening the
   * popup focuses the search field natively, but the field painted no ring, so
   * the surface the user typed into was invisible.
   *
   * The rebuilt binding delivers no `focus`/`blur` for `focusElement`,
   * `focusNext` or a pointer focus change (measured in plan 536), so "the ring
   * leaves while the popup stays open" cannot be observed here; the live-window
   * check is recorded in `TODO.md` → Interlocks. What is observable: the ring is
   * seeded on open, the field unmounts on close, and a reopen rings it again.
   */
  it("paints the focus ring on the search field", async () => {
    const picker = renderComponent(<Picker />);
    await open(picker);

    expect(focusedTestId(picker)).toEqual(Option.some("combobox-input"));
    expect(
      picker.renderer.findByTestId("combobox-input")?.style.boxShadow,
    ).toBeDefined();

    picker.renderer.simulateKeystrokes("escape");
    await settle();
    expect(picker.renderer.findByTestId("combobox-input")).toBeUndefined();
    expect(focusedTestId(picker)).toEqual(Option.some("combobox-trigger"));

    await open(picker);
    expect(
      picker.renderer.findByTestId("combobox-input")?.style.boxShadow,
    ).toBeDefined();

    picker.unmount();
  });
});
