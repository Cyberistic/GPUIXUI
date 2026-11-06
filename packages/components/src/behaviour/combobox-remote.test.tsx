import { describe, expect, it } from "vitest";
import {
  clickCentreOf,
  focusedTestId,
  waitFor,
} from "../internal/interaction.js";
import * as Option from "effect/Option";
import {
  renderComponent,
  type ComponentTestRoot,
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

const reviewers: ReadonlyArray<ComboboxOption> = [
  { value: "ada", label: "Ada Lovelace", description: "Mathematics" },
  { value: "grace", label: "Grace Hopper", description: "Compilers" },
];

const RemotePicker = ({
  options = reviewers,
  onQueryChange,
  shouldFilter,
  loading,
  disabled,
  empty,
}: {
  readonly options?: ReadonlyArray<ComboboxOption>;
  readonly onQueryChange?: (query: string) => void;
  readonly shouldFilter?: boolean;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly empty?: string;
}) => (
  <div style={{ width: 360, padding: 40 }}>
    <Combobox
      options={options}
      onQueryChange={onQueryChange}
      shouldFilter={shouldFilter}
      loading={loading}
      disabled={disabled}
    >
      <ComboboxTrigger label="Assign reviewer" />
      <ComboboxContent>
        <ComboboxInput label="Search reviewers" />
        <ComboboxList label="Reviewers" />
        <ComboboxEmpty>{empty}</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  </div>
);

const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const open = async (root: ComponentTestRoot): Promise<void> => {
  clickCentreOf(root, "combobox-trigger");
  await settle();
};

const type = (root: ComponentTestRoot, text: string): void => {
  text.split("").forEach((key) => root.renderer.simulateKeystrokes(key));
};

describe("Combobox with a remote list", () => {
  it("reports the empty search it opens with and every query typed after it", async () => {
    const queries: string[] = [];
    const picker = renderComponent(
      <RemotePicker onQueryChange={(query) => queries.push(query)} />,
    );

    await open(picker);
    expect(focusedTestId(picker)).toEqual(Option.some("combobox-input"));

    expect(queries).toEqual([""]);

    type(picker, "ca");
    await settle();

    expect(queries).toContain("c");
    expect(queries.at(-1)).toBe("ca");

    picker.renderer.simulateKeystrokes("escape");
    await settle();
    expect(queries.at(-1)).toBe("ca");

    picker.unmount();
  });

  it("paints a remote result the query does not appear in, in the caller's order", async () => {
    const picker = renderComponent(<RemotePicker shouldFilter={false} />);

    await open(picker);
    type(picker, "eng");
    await settle();

    expect(picker.renderer.getAllText()).toContain("Ada Lovelace");

    picker.unmount();
  });

  it("stops reporting when the caller disables the control", async () => {
    const queries: string[] = [];
    const picker = renderComponent(
      <RemotePicker onQueryChange={(query) => queries.push(query)} />,
    );

    await open(picker);
    type(picker, "ca");
    await settle();
    const before = queries.length;

    picker.rerender(
      <RemotePicker onQueryChange={(query) => queries.push(query)} disabled />,
    );
    await settle();

    expect(queries).toHaveLength(before);

    await waitFor(() =>
      expect(picker.renderer.findByTestId("combobox-content")).toBeUndefined(),
    );

    picker.unmount();
  });

  it("hides what the local ranking would have hidden without the switch", async () => {
    const picker = renderComponent(<RemotePicker />);

    await open(picker);
    type(picker, "eng");
    await settle();

    expect(picker.renderer.getAllText()).not.toContain("Ada Lovelace");
    expect(picker.renderer.getAllText()).toContain("No matches");

    picker.unmount();
  });

  it("says it is searching while the caller's fetch is in flight", async () => {
    const picker = renderComponent(<RemotePicker options={[]} loading />);

    await open(picker);
    expect(picker.renderer.getAllText()).toContain("Searching…");
    expect(picker.renderer.getAllText()).not.toContain("No matches");

    picker.rerender(<RemotePicker options={[]} />);
    await settle();

    expect(picker.renderer.getAllText()).toContain("No matches");
    expect(picker.renderer.getAllText()).not.toContain("Searching…");

    picker.unmount();
  });

  it("lets a caller's empty slot paint its own words while a fetch runs", async () => {
    const picker = renderComponent(
      <RemotePicker options={[]} loading empty="Looking people up" />,
    );

    await open(picker);

    expect(picker.renderer.getAllText()).toContain("Looking people up");
    expect(picker.renderer.getAllText()).not.toContain("Searching…");

    picker.unmount();
  });
});
