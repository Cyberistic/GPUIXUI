/**
 * The label trap: a visible `Label` does not name a control.
 *
 * GPUix has no `aria-labelledby`, so the label and the control are two
 * unconnected nodes. Three pages used to tell a reader the opposite — "pair it
 * with a `Label`" / "the visible name goes in a `Label` beside it" — which
 * produces a control that paints a name and announces nothing. The trap is
 * invisible in a screenshot, which is why it survived.
 *
 * `runtime/labelling.runtime.test.tsx` measures the fact in a real window; this
 * suite holds the prose and the prop comments to it, so the retracted advice
 * cannot come back. `node:fs` here is the same test-time boundary
 * `docs.test.ts` and `inventory.test.ts` use.
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);

/** A file in the package, or a failure that names the path. */
const read = (relative: string): string =>
  existsSync(fileURLToPath(new URL(relative, packageRoot)))
    ? readFileSync(fileURLToPath(new URL(relative, packageRoot)), "utf8")
    : "";
const missing = (relative: string): boolean =>
  !existsSync(fileURLToPath(new URL(relative, packageRoot)));

/** The pages that describe a control named by a separate label. */
const PAGES = ["docs/checkbox.mdx", "docs/switch.mdx", "docs/input.mdx"];

/** The prop comments a caller reads in their editor. */
const SOURCES = ["src/components/Checkbox.tsx", "src/components/Switch.tsx"];

/**
 * The retracted instruction, in the forms it was written.
 *
 * A page may still recommend a visible `Label` — it must not present it as the
 * thing that names the control.
 */
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

  it("is described as unassociated, and the control's own prop as the name", () => {
    const problems = Arr.flatMap(PAGES, (file) => {
      const page = read(file);
      return [
        ...(/not associated|does not name/.test(page)
          ? []
          : [`${file}: never says the label is unassociated`]),
        ...(/labelledBy|`label` prop/.test(page)
          ? []
          : [`${file}: never names the control's own label prop`]),
      ];
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
