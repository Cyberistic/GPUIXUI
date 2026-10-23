/**
 * The triggers that are the shared action.
 *
 * `PopoverTrigger`, `DatePickerTrigger` and `NavigationMenuLink` used to expose
 * this package's local `ButtonProps` (`Props` plus four look names), so a
 * caller's `onClick` was the action's handler and the new `onActivate` did not
 * exist. Plan `160`'s Phase 3 moves the three parts onto
 * `@gpuixui/primitives`' `ButtonProps`: one action contract in the workspace,
 * with the primitives' look names, `loading`, the host-prop surface and a
 * state-aware `style`. A caller's old `onClick` stays as a deprecated alias for
 * `onActivate`, and the new name wins when both are given — the same rule
 * `docs/component-api.md` §2 records for `onCheckedChange`/`onValueChange`, so
 * migrating cannot run a handler twice.
 *
 * This guard reads the three sources because the claim is about their public
 * types and the wiring behind them; the behaviour suites prove the routes
 * (Enter, the deprecated alias, the alias rule) in the real renderer.
 *
 * `node:fs` is a test-time repository read, the boundary `api.test.ts` and
 * `inventory.test.ts` already use.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** The source that declares one of the three public prop types. */
const sourceOf = {
  popover: () => read("./popover.tsx"),
  datePicker: () => read("./date-picker.tsx"),
  navigationMenu: () => read("./navigation-menu.tsx"),
} as const;

/** A public interface's body, from its declaration to the closing brace. */
const interfaceBody = (source: string, name: string): string => {
  const start = source.indexOf(`export interface ${name}`);
  if (start < 0) return "";
  const end = source.indexOf("\n}", start);
  return end < 0 ? "" : source.slice(start, end);
};

/** The same text with every run of whitespace collapsed: the formatter reflows. */
const flat = (text: string): string => text.replace(/\s+/g, " ");

/** The same text with whitespace removed, for a declaration's exact shape. */
const squash = (text: string): string => text.replace(/\s+/g, "");

/** The three public prop types, and the part each one belongs to. */
const parts = [
  {
    part: "PopoverTrigger",
    type: "PopoverTriggerProps",
    source: sourceOf.popover,
    page: "docs/popover.mdx",
    narrowing: "PrimitiveButtonProps",
    // The part that composes the caller's handler.
    activation: sourceOf.popover,
  },
  {
    part: "DatePickerTrigger",
    type: "DatePickerTriggerProps",
    source: sourceOf.datePicker,
    page: "docs/date-picker.mdx",
    narrowing: 'Omit<PrimitiveButtonProps, "children">',
    // The trigger delegates the action to the popover trigger it composes.
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

/** A page's prose and API table, read from the package's docs. */
const page = (relative: string): string => read(`../${relative}`);

describe("the triggers that are the shared action", () => {
  it.each(parts)(
    "$part's props are the primitives' action contract, not this package's",
    ({ type, source, narrowing }) => {
      const body = interfaceBody(source(), type);

      expect(squash(body)).toContain(squash(`extends ${narrowing}`));
      // The retired base: the adapter's `Props`-shaped `ButtonProps`.
      expect(flat(body)).not.toMatch(/extends (Omit<)?ButtonProps/);
    },
  );

  it.each(parts)(
    "$part keeps onClick as a deprecated alias for onActivate",
    ({ type, source, activation }) => {
      const body = interfaceBody(source(), type);

      expect(body).toContain("@deprecated use `onActivate`");
      expect(body).toContain("readonly onClick?:");
      // The alias rule, in one expression: the new name wins when both arrive.
      expect(activation()).toContain("(onActivate ?? onClick)?.(event)");
    },
  );

  it("does not hand a trigger's press to the primitive's pointer observer", () => {
    // `composePress` runs `onClick` and `onActivate` on one press, so wiring the
    // caller's handler through both would run it twice.
    expect(sourceOf.popover()).not.toContain("onClick={onClick}");
    expect(sourceOf.navigationMenu()).not.toContain("onClick={onClick}");
  });

  it("routes the date picker's trigger through the popover trigger", () => {
    // The alias and the toggle live in one part; the picker's trigger composes
    // it rather than installing a second open path.
    expect(sourceOf.datePicker()).toContain("<PopoverTrigger");
  });

  it.each(parts)("$part's page documents the contract", ({ page: path }) => {
    const pageSource = page(path);

    expect(pageSource).toContain("onActivate");
    expect(pageSource).toContain("deprecated alias");
  });
});
