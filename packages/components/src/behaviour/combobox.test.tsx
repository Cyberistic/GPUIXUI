/**
 * Combobox behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a popup that opens without focusing its search field; a
 * filter that hides matches; a selection that reports the label instead of the
 * value; a single select that does not replace the previous value; a multi select
 * that loses order or duplicates; a disabled option that can still be chosen; an
 * empty state that never appears; a ranking that puts `Vacation` before
 * `Calendar`; a whitespace-only option label that painted the trigger blank
 * instead of naming the value; and Escape that does not return focus to the
 * trigger.
 *
 * Pointer coverage: the suite originally drove every selection from the
 * keyboard, so a wrapper that ignored a clicked option, kept the popup open, or
 * let a disabled option through would have passed.
 */

import { contrastFloors, contrastRatio } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { Dialog, DialogContent } from "../dialog.js";
import {
  clickCentreOf,
  waitFor,
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
import { MotionProvider } from "../motion.js";

const options: ReadonlyArray<ComboboxOption> = [
  { value: "calendar", label: "Calendar", description: "Scheduling" },
  { value: "camera", label: "Camera", description: "Hardware" },
  { value: "vacation", label: "Vacation", description: "Time off" },
  { value: "desk", label: "Desk booking", description: "Workspace" },
];

const Picker = ({
  onValueChange,
  multiple,
  disabledCamera,
  disabled,
  empty,
  triggerPlaceholder,
  triggerLabel = "Assign reviewer",
  onCreate,
}: {
  readonly onValueChange?: (
    value: string | null | ReadonlyArray<string>,
  ) => void;
  readonly multiple?: boolean;
  readonly disabledCamera?: boolean;
  readonly disabled?: boolean;
  readonly empty?: string;
  readonly triggerPlaceholder?: string;
  readonly triggerLabel?: string;
  readonly onCreate?: (query: string) => void;
}) => (
  <div style={{ width: 360, padding: 40 }}>
    <Combobox
      options={
        disabledCamera === true
          ? options.map((option) =>
              option.value === "camera"
                ? { ...option, disabled: true }
                : option,
            )
          : options
      }
      multiple={multiple}
      disabled={disabled}
      onValueChange={onValueChange}
      {...(onCreate === undefined ? {} : { onCreate })}
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

/** A trigger near the window centre, where a centred popup has room to sit. */
const CentredPicker = () => (
  <div style={{ paddingLeft: 540, paddingTop: 100 }}>
    <Combobox options={options}>
      <ComboboxTrigger label="Assign reviewer" />
      <ComboboxContent align="center">
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

/** A trigger low enough to leave the top side room, which this picker asks for. */
const TopPicker = () => (
  <div style={{ paddingTop: 320 }}>
    <Combobox options={options}>
      <ComboboxTrigger label="Assign reviewer" />
      <ComboboxContent side="top">
        <ComboboxInput label="Search reviewers" />
        <ComboboxList label="Reviewers" />
      </ComboboxContent>
    </Combobox>
  </div>
);

/** Let the runtime's microtask (focus) and React's updates settle. */
const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
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

  it("centres a requested popup on its trigger", async () => {
    const picker = renderComponent(<CentredPicker />);

    await open(picker);

    const trigger = requireBounds(picker, "combobox-trigger");
    const surface = requireBounds(picker, "combobox-content");

    expect(
      Math.abs(surface.x + surface.width / 2 - (trigger.x + trigger.width / 2)),
    ).toBeLessThanOrEqual(1);

    picker.unmount();
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

  it("offers a create row for an unmatched query and reports it once", async () => {
    const onCreate = vi.fn();
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <Picker onCreate={onCreate} onValueChange={onValueChange} />,
    );
    await open(picker);

    type(picker, "zzz");
    await settle();

    expect(picker.renderer.findByTestId("combobox-create")).toBeDefined();
    expect(picker.renderer.getAllText()).toContain('Create "zzz"');

    picker.renderer.simulateKeystrokes("enter");
    await settle();

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith("zzz");
    await waitFor(() =>
      expect(picker.renderer.findByTestId("combobox-content")).toBeUndefined(),
    );
    expect(focusedTestId(picker)).toEqual(Option.some("combobox-trigger"));

    // The root reports the query; only the caller can add the option, so no
    // selection is invented.
    expect(onValueChange).not.toHaveBeenCalled();
    expect(picker.renderer.getAllText()).toContain("Select…");

    picker.unmount();
  });

  it("offers no create row when an option matches or the query is blank", async () => {
    const matching = renderComponent(<Picker onCreate={() => undefined} />);
    await open(matching);
    type(matching, "vac");
    await settle();
    await waitFor(() =>
      expect(matching.renderer.findByTestId("combobox-create")).toBeUndefined(),
    );
    expect(matching.renderer.getAllText()).toContain("Vacation");
    matching.unmount();

    const blank = renderComponent(<Picker onCreate={() => undefined} />);
    await open(blank);
    await waitFor(() =>
      expect(blank.renderer.findByTestId("combobox-create")).toBeUndefined(),
    );
    blank.unmount();
  });

  it("offers no create row without a handler or in multiple mode", async () => {
    const noHandler = renderComponent(<Picker />);
    await open(noHandler);
    type(noHandler, "zzz");
    await settle();
    await waitFor(() =>
      expect(
        noHandler.renderer.findByTestId("combobox-create"),
      ).toBeUndefined(),
    );
    noHandler.unmount();

    const multiple = renderComponent(
      <Picker multiple onCreate={() => undefined} />,
    );
    await open(multiple);
    type(multiple, "zzz");
    await settle();
    await waitFor(() =>
      expect(multiple.renderer.findByTestId("combobox-create")).toBeUndefined(),
    );
    multiple.unmount();
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

  it("paints a disabled row in the disabled pair instead of fading it", async () => {
    // The row faded itself to 50%, a third fade painter the token pages do not
    // name — they say the `@gpuixui/tw` recipes and the Button's ghost path are
    // the two that remain. A menu-like row wears the `disabled` /
    // `disabledForeground` pair, which `contrastPairs` measures on the popover;
    // a row-level opacity composites the label into the fill instead.
    const painted = (root: ComponentTestRoot, value: string) =>
      root.renderer.getElement(root.renderer.findByText(value)?.parentId ?? -1)
        ?.style.color;

    const dark = renderComponent(<Picker disabledCamera />);
    await open(dark);
    expect(
      dark.renderer.findByTestId("combobox-option-camera")?.style.opacity,
    ).toBeUndefined();
    expect(painted(dark, "Camera")).toBe(darkTheme.colors.disabledForeground);
    expect(painted(dark, "Hardware")).toBe(darkTheme.colors.disabledForeground);
    dark.unmount();

    const light = renderComponent(<Picker disabledCamera />, "light");
    await open(light);
    expect(painted(light, "Camera")).toBe(lightTheme.colors.disabledForeground);
    expect(painted(light, "Hardware")).toBe(
      lightTheme.colors.disabledForeground,
    );
    light.unmount();

    // The role pair clears the floor the theme asks of a disabled control on the
    // surface the row floats on; the painted pair is what the contract holds.
    Arr.forEach([lightTheme, darkTheme], (theme) => {
      expect(
        contrastRatio(theme.colors.disabledForeground, theme.colors.popover) ??
          0,
      ).toBeGreaterThanOrEqual(contrastFloors.disabled);
    });
  });

  it("closes a popup the caller disables, and does not reopen it", async () => {
    // The bug this guards: a trigger that is disabled while its popup is open
    // leaves the surface mounted, so the control paints rows no press can
    // choose. The popped-out list closes with the control and the stored request
    // is dropped, so re-enabling does not resurrect it.
    const onValueChange = vi.fn();
    const picker = renderComponent(<Picker onValueChange={onValueChange} />);
    await open(picker);
    expect(picker.renderer.findByTestId("combobox-content")).toBeDefined();

    picker.rerender(<Picker disabled onValueChange={onValueChange} />);
    await settle();
    expect(picker.renderer.findByTestId("combobox-content")).toBeUndefined();

    // Re-enabling brings no surface back on its own, and the trigger still
    // refuses while it is disabled.
    picker.rerender(<Picker onValueChange={onValueChange} />);
    await settle();
    expect(picker.renderer.findByTestId("combobox-content")).toBeUndefined();
    picker.rerender(<Picker disabled onValueChange={onValueChange} />);
    await settle();
    clickCentreOf(picker, "combobox-trigger");
    await settle();
    expect(picker.renderer.findByTestId("combobox-content")).toBeUndefined();
    expect(onValueChange).not.toHaveBeenCalled();

    picker.unmount();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const picker = renderComponent(<Picker />);
    await open(picker);

    picker.renderer.simulateKeystrokes("escape");
    await settle();

    await waitFor(() =>
      expect(picker.renderer.findByTestId("combobox-content")).toBeUndefined(),
    );
    expect(focusedTestId(picker)).toEqual(Option.some("combobox-trigger"));

    picker.unmount();
  });

  it("closes only its own popup on Escape inside a dialog", async () => {
    const nested = renderComponent(
      <Dialog defaultOpen>
        <DialogContent label="Assign reviewer" testId="dialog-panel">
          <Picker />
        </DialogContent>
      </Dialog>,
    );
    await open(nested);
    expect(nested.renderer.findByTestId("combobox-content")).toBeDefined();

    nested.renderer.simulateKeystrokes("escape");
    await settle();

    await waitFor(() =>
      expect(nested.renderer.findByTestId("combobox-content")).toBeUndefined(),
    );
    expect(nested.renderer.findByTestId("dialog-panel")).toBeDefined();

    nested.renderer.simulateKeystrokes("escape");
    await settle();

    await waitFor(() =>
      expect(nested.renderer.findByTestId("dialog-panel")).toBeUndefined(),
    );

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
    await waitFor(() =>
      expect(picker.renderer.findByTestId("combobox-content")).toBeUndefined(),
    );
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

    await waitFor(() =>
      expect(picker.renderer.findByTestId("combobox-content")).toBeUndefined(),
    );

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

    // A blank label is absence, not a name: a list decoded from a table whose
    // name column has no text must name the selection by its value instead of
    // painting the caller's whitespace as an empty trigger.
    const blankLabel = renderComponent(
      <div style={{ width: 360, padding: 40 }}>
        <Combobox options={[{ value: "ada", label: "   " }]} defaultValue="ada">
          <ComboboxTrigger label="Assign reviewer" />
          <ComboboxContent>
            <ComboboxInput label="Search reviewers" />
            <ComboboxList label="Reviewers" />
          </ComboboxContent>
        </Combobox>
      </div>,
    );

    expect(blankLabel.renderer.getAllText()).toContain("ada");

    blankLabel.unmount();
  });
});

/** Let the runtime's frame loop publish what the last commit queued. */
const frame = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 30));

describe("the popup's entrance", () => {
  it("travels down into place when it opens below its trigger", async () => {
    // The bugs this guards: a popup that pops into place while every other
    // anchored panel fades and travels, and a travel that points at the wrong
    // edge of the trigger.
    const picker = renderComponent(<Picker />);
    picker.renderer.clockPause();
    await open(picker);

    const trigger = requireBounds(picker, "combobox-trigger");
    const entering = requireBounds(picker, "combobox-content").y;
    expect(entering).toBeGreaterThanOrEqual(trigger.y + trigger.height);

    picker.renderer.clockFastForward(400);
    await frame();
    const resting = requireBounds(picker, "combobox-content").y;

    // Below its trigger, the popup starts above its resting place and moves down.
    expect(resting - entering).toBe(4);
    picker.unmount();
  });

  it("enters from below when it is asked to open above its trigger", async () => {
    // The direction follows the side the popup was asked to open at, so this
    // case fails if the entrance is hardcoded to the default bottom travel.
    const picker = renderComponent(<TopPicker />);
    picker.renderer.clockPause();
    await open(picker);

    const trigger = requireBounds(picker, "combobox-trigger");
    const entering = requireBounds(picker, "combobox-content");
    // The requested side had room, so the popup stayed where it was put.
    expect(entering.y + entering.height).toBeLessThanOrEqual(trigger.y);

    picker.renderer.clockFastForward(400);
    await frame();
    const resting = requireBounds(picker, "combobox-content");

    // Above its trigger, the popup starts below its resting place and moves up.
    expect(entering.y - resting.y).toBe(4);
    picker.unmount();
  });

  it("keeps the entrance its requested side owns when the component flips it", async () => {
    // A surface's first motion frame is fixed when its host mounts, which is one
    // commit before the measured flip can re-anchor it: a popup the component
    // flips above its trigger still travels the way its requested bottom side
    // travels. This case pins that measured limitation, so the arrangement that
    // retargets the entrance has to say so here as well as in the docs.
    const picker = renderComponent(<LowPicker />);
    picker.renderer.clockPause();
    await open(picker);

    const trigger = requireBounds(picker, "combobox-trigger");
    const entering = requireBounds(picker, "combobox-content");
    // The measured placement put it above the trigger that opened it.
    expect(entering.y).toBeLessThan(trigger.y);

    picker.renderer.clockFastForward(400);
    await frame();
    const resting = requireBounds(picker, "combobox-content");

    expect(entering.y - resting.y).toBe(-4);
    picker.unmount();
  });

  it("paints the resting frame on the first frame under reduced motion", async () => {
    const picker = renderComponent(
      <MotionProvider preference="reduced">
        <Picker />
      </MotionProvider>,
    );
    picker.renderer.clockPause();
    await open(picker);
    const first = requireBounds(picker, "combobox-content").y;

    picker.renderer.clockFastForward(400);
    await frame();

    expect(requireBounds(picker, "combobox-content").y).toBe(first);
    picker.unmount();
  });
});
