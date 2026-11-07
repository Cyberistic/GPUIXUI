import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const sourceOf = {
  popover: () => read("./popover.tsx"),
  datePicker: () => read("./date-picker.tsx"),
  navigationMenu: () => read("./navigation-menu.tsx"),
} as const;

const interfaceBody = (source: string, name: string): string => {
  const start = source.indexOf(`export interface ${name}`);
  if (start < 0) return "";
  const end = source.indexOf("\n}", start);
  return end < 0 ? "" : source.slice(start, end);
};

const flat = (text: string): string => text.replace(/\s+/g, " ");

const squash = (text: string): string => text.replace(/\s+/g, "");

const parts = [
  {
    part: "PopoverTrigger",
    type: "PopoverTriggerProps",
    source: sourceOf.popover,
    page: "docs/popover.mdx",
    narrowing: "PrimitiveButtonProps",

    activation: sourceOf.popover,
  },
  {
    part: "DatePickerTrigger",
    type: "DatePickerTriggerProps",
    source: sourceOf.datePicker,
    page: "docs/date-picker.mdx",
    narrowing: 'Omit<PrimitiveButtonProps, "children">',

    activation: sourceOf.popover,
  },
  {
    part: "NavigationMenuLink",
    type: "NavigationMenuLinkProps",
    source: sourceOf.navigationMenu,
    page: "docs/navigation-menu.mdx",
    narrowing: 'Omit<PrimitiveButtonProps, "variant">',
    activation: sourceOf.navigationMenu,
  },
] as const;

const page = (relative: string): string => read(`../${relative}`);

describe("the triggers that are the shared action", () => {
  it.each(parts)(
    "$part's props are the primitives' action contract, not this package's",
    ({ type, source, narrowing }) => {
      const body = interfaceBody(source(), type);

      expect(squash(body)).toContain(squash(`extends ${narrowing}`));

      expect(flat(body)).not.toMatch(/extends (Omit<)?ButtonProps/);
    },
  );

  it.each(parts)(
    "$part keeps onClick as an alias for onActivate",
    ({ type, source, activation }) => {
      const body = interfaceBody(source(), type);

      expect(body).toContain("readonly onClick?:");

      expect(activation()).toContain("(onActivate ?? onClick)?.(event)");
    },
  );

  it("does not hand a trigger's press to the primitive's pointer observer", () => {
    expect(sourceOf.popover()).not.toContain("onClick={onClick}");
    expect(sourceOf.navigationMenu()).not.toContain("onClick={onClick}");
  });

  it("routes the date picker's trigger through the popover trigger", () => {
    expect(sourceOf.datePicker()).toContain("<PopoverTrigger");
  });

  it.each(parts)("$part's page documents the contract", ({ page: path }) => {
    const pageSource = page(path);

    expect(pageSource).toContain("onActivate");
    expect(pageSource).toContain("deprecated alias");
  });
});
