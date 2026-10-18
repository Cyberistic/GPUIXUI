import { describe, expect, it } from "vitest";
import { bySlug } from "./registry";
import { componentSymbols } from "./symbols";

/**
 * Guards plan 500: a documented `<Symbol>Props` type names its component, so a
 * reader who types the real export (`Spinner`) reaches a page whose inventory
 * title is "Loading indicators". The bugs guarded are a stem that keeps the
 * `Props` suffix (no query can ever equal it), a suffix-less type that invents
 * a symbol, repeated types that list a component twice, and a record that loses
 * the props type its exported name comes from.
 */
const symbolsOf = (slug: string): ReadonlyArray<string> => {
  const record = bySlug.get(slug);
  if (record === undefined) throw new Error(`registry is missing ${slug}`);
  return componentSymbols(record);
};

describe("componentSymbols", () => {
  it("strips the props suffix to the name a consumer imports", () => {
    expect(componentSymbols({ api: ["SpinnerProps"] })).toEqual(["Spinner"]);
  });

  it("ignores a name that is not a props type", () => {
    expect(componentSymbols({ api: ["Spinner", "ComponentMeta"] })).toEqual([]);
  });

  it("lists a repeated type once, in page order", () => {
    expect(
      componentSymbols({
        api: ["CardProps", "CardHeaderProps", "CardProps"],
      }),
    ).toEqual(["Card", "CardHeader"]);
  });

  it("gives every record whose title differs from its export its real name", () => {
    const expected = {
      spinner: "Spinner",
      "scroll-area": "ScrollArea",
      "text-area": "TextArea",
      "button-group": "ButtonGroup",
      "number-field": "NumberField",
      "otp-field": "OTPField",
      "inline-validation": "Field",
      "confirm-dialog": "ConfirmDialog",
      stack: "Grid",
    } as const;
    const missing = Object.entries(expected).flatMap(([slug, symbol]) =>
      symbolsOf(slug).includes(symbol) ? [] : [`${slug}: ${symbol}`],
    );
    expect(missing).toEqual([]);
  });
});
