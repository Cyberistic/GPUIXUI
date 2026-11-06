import { describe, expect, it } from "vitest";
import {
  CREATE_ROW_PREFIX,
  createQuery,
  firstEnabled,
  isCreateRow,
  nextHighlight,
  offersCreate,
  rankOf,
  toggleSelection,
  triggerLabel,
  visibleOptions,
  type PreviewComboboxOption,
} from "./combobox-preview";

const team: ReadonlyArray<PreviewComboboxOption> = [
  {
    value: "ada",
    label: "Ada Lovelace",
    description: "Engineering · compilers",
  },
  {
    value: "grace",
    label: "Grace Hopper",
    description: "Platform · releases",
  },
  {
    value: "alan",
    label: "Alan Turing",
    description: "Research · theory",
  },
  { value: "external", label: "External reviewers", disabled: true },
];

const values = (options: ReadonlyArray<PreviewComboboxOption>): string[] =>
  options.map((option) => option.value);

describe("the combobox preview's ranking", () => {
  it("ranks a prefix above a word prefix above a substring above a description", () => {
    const description: PreviewComboboxOption = {
      value: "description",
      label: "Ledger",
      description: "hopp",
    };
    const substring: PreviewComboboxOption = {
      value: "substring",
      label: "Shoppe",
      description: "Ships",
    };
    const word: PreviewComboboxOption = {
      value: "word",
      label: "Grace Hopper",
      description: "Compilers",
    };
    const prefix: PreviewComboboxOption = {
      value: "prefix",
      label: "Hopper, Grace",
      description: "Compilers",
    };
    const options = [description, substring, word, prefix];

    expect(rankOf(prefix, "hopp")).toBe(0);
    expect(rankOf(word, "hopp")).toBe(1);
    expect(rankOf(substring, "hopp")).toBe(2);
    expect(rankOf(description, "hopp")).toBe(3);
    expect(values(visibleOptions(options, "hopp"))).toEqual([
      "prefix",
      "word",
      "substring",
      "description",
    ]);
  });

  it("keeps declaration order when two options earn the same rank", () => {
    const first: PreviewComboboxOption = {
      value: "first",
      label: "Ada One",
    };
    const second: PreviewComboboxOption = {
      value: "second",
      label: "Ada Two",
    };

    expect(rankOf(first, "ada")).toBe(rankOf(second, "ada"));
    expect(values(visibleOptions([first, second], "ada"))).toEqual([
      "first",
      "second",
    ]);
  });

  it("shows a blank query as the caller declared it, disabled rows included", () => {
    const options: ReadonlyArray<PreviewComboboxOption> = [
      { value: "first", label: "First" },
      { value: "off", label: "Off", disabled: true },
      { value: "second", label: "Second" },
    ];

    expect(values(visibleOptions(options, "   "))).toEqual([
      "first",
      "off",
      "second",
    ]);
  });

  it("keeps a disabled row visible but drops an option that does not match", () => {
    expect(values(visibleOptions(team, "external"))).toEqual(["external"]);
    expect(values(visibleOptions(team, "turing"))).toEqual(["alan"]);
    expect(values(visibleOptions(team, "payroll"))).toEqual([]);
  });
});

describe("the combobox preview's highlight", () => {
  it("skips a disabled row and wraps at either end", () => {
    const options: ReadonlyArray<PreviewComboboxOption> = [
      { value: "one", label: "One" },
      { value: "off", label: "Off", disabled: true },
      { value: "two", label: "Two" },
    ];

    expect(nextHighlight(options, "one", 1)).toBe("two");
    expect(nextHighlight(options, "two", -1)).toBe("one");
    expect(nextHighlight(options, "two", 1)).toBe("one");
  });

  it("starts on the first row that can be chosen, or nowhere", () => {
    expect(firstEnabled(team)).toBe("ada");
    expect(
      firstEnabled([
        { value: "off", label: "Off", disabled: true },
        { value: "one", label: "One" },
      ]),
    ).toBe("one");
    expect(
      firstEnabled([{ value: "off", label: "Off", disabled: true }]),
    ).toBeNull();
    expect(nextHighlight([], null, 1)).toBeNull();
  });
});

describe("the combobox preview's selection", () => {
  it("appends a pick in the chosen order and removes it on a second pick", () => {
    expect(toggleSelection([], "perf")).toEqual(["perf"]);
    expect(toggleSelection(["perf"], "docs")).toEqual(["perf", "docs"]);
    expect(toggleSelection(["perf", "docs"], "perf")).toEqual(["docs"]);
  });

  it("joins the chosen labels for the trigger, or shows its placeholder", () => {
    expect(triggerLabel(team, ["grace", "ada"], "Choose…")).toBe(
      "Grace Hopper, Ada Lovelace",
    );
    expect(triggerLabel(team, [], "Choose…")).toBe("Choose…");

    expect(triggerLabel(team, ["gone"], "Choose…")).toBe("gone");
  });
});

describe("the combobox preview's create row", () => {
  it("is offered only for a non-blank query that matched nothing", () => {
    expect(offersCreate([], "Nina", true)).toBe(true);
    expect(offersCreate([], "Nina", false)).toBe(false);
    expect(offersCreate([], "   ", true)).toBe(false);
    expect(offersCreate([{ value: "ada", label: "Ada" }], "Nina", true)).toBe(
      false,
    );
  });

  it("carries a sentinel a caller option cannot collide with", () => {
    const value = `${CREATE_ROW_PREFIX}Nina`;

    expect(isCreateRow(value)).toBe(true);
    expect(createQuery(value)).toBe("Nina");
    expect(isCreateRow("nina")).toBe(false);
  });
});
