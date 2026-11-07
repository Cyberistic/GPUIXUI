import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);

const read = (relative: string): string =>
  existsSync(fileURLToPath(new URL(relative, packageRoot)))
    ? readFileSync(fileURLToPath(new URL(relative, packageRoot)), "utf8")
    : "";
const missing = (relative: string): boolean =>
  !existsSync(fileURLToPath(new URL(relative, packageRoot)));

const PAGES = ["docs/checkbox.mdx", "docs/switch.mdx", "docs/input.mdx"];

const SOURCES = ["src/components/Checkbox.tsx", "src/components/Switch.tsx"];

const RETRACTED = [
  "pair it with a `Label`",
  "pair it with a visible\n  `Label` or text row",
  "pair with a visible `Label`",
  "visible name goes in a `Label` beside it",
];

describe("a Label beside a control", () => {
  it("is never described as the control's name", () => {
    const problems = Arr.flatMap([...PAGES, ...SOURCES], (file) =>
      Arr.filter(RETRACTED, (phrase) => read(file).includes(phrase)).map(
        (phrase) => `${file}: still says "${phrase}"`,
      ),
    );
    expect(problems).toEqual([]);
  });

  it("names the control's own label prop", () => {
    const problems = Arr.flatMap(PAGES, (file) => {
      const page = read(file);
      return /(^|\n)\| `label` \|/.test(page) || page.includes("labelledBy")
        ? []
        : [`${file}: never names the control's own label prop`];
    });
    expect(problems).toEqual([]);
  });

  it("is contradicted by a runtime proof that covers all three controls", () => {
    const proof = "runtime/labelling.runtime.test.tsx";
    expect(missing(proof)).toBe(false);
    const source = read(proof);
    expect(
      Arr.filter(
        ["CheckBox", "Switch", "TextInput"],
        (role) => !source.includes(role),
      ),
    ).toEqual([]);
  });
});
