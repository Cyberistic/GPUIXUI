import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as R from "effect/Record";
import { ICON_NAMES } from "./names.js";
import { icons } from "./registry.js";

/**
 * Guards the icon registry's structure, not its art.
 *
 * A monochrome icon is only paintable by GPUix if it is self-contained, on the
 * 24x24 grid, and carries no colour of its own — the tint comes from
 * `style.color`, so **any** paint literal in the markup is invisible to the
 * theme. Each assertion below is a bug that shipped somewhere before: a
 * foreign `fill`, an off-grid `viewBox`, an external reference.
 */

const PAINT = /(?:fill|stroke)="([^"]*)"/g;

describe("icon registry", () => {
  it("gives every icon a 24x24 viewBox", () => {
    const offGrid = Arr.filter(
      R.toEntries(icons),
      ([, markup]) => !markup.includes('viewBox="0 0 24 24"'),
    );
    expect(offGrid.map(([name]) => name)).toEqual([]);
  });

  it("paints every icon in a colour GPUix can retint", () => {
    const wrongPaints = Arr.flatMap(R.toEntries(icons), ([name, markup]) =>
      Arr.flatMap(Arr.fromIterable(markup.matchAll(PAINT)), ([, paint]) =>
        paint === "none" || paint === "#000" ? [] : [`${name}: ${paint}`],
      ),
    );
    expect(wrongPaints).toEqual([]);
  });

  it("draws every icon with at least one shape", () => {
    const empty = Arr.filter(
      R.toEntries(icons),
      ([, markup]) =>
        !/<(?:path|circle|rect|line|polyline|polygon)\b/.test(markup),
    );
    expect(empty.map(([name]) => name)).toEqual([]);
  });

  it("stays self-contained: no scripts, images, styles or external references", () => {
    const foreign =
      /<(script|image|foreignObject|style|use)\b|href=|url\(|@import/;
    const offenders = Arr.filter(R.toEntries(icons), ([, markup]) =>
      foreign.test(markup),
    );
    expect(offenders.map(([name]) => name)).toEqual([]);
  });

  it("draws only with the element types the runtime suite has painted", () => {
    // The window suite paints the shared grammar (`check` and `star-filled` are
    // `path`/`circle` shapes). A new element type (`ellipse`, `text`, `mask`)
    // paints its own default — or nothing — until a probe measures it, so the
    // set stays on the elements it has measured.
    const PAINTED = Arr.fromIterable([
      "path",
      "circle",
      "rect",
      "line",
      "polyline",
      "polygon",
    ]);
    const drawn = (markup: string): ReadonlyArray<string> =>
      Arr.map(
        [...markup.matchAll(/<(?!svg\b)([a-zA-Z]+)\b/g)],
        (match) => match[1] ?? "",
      );
    const unmeasured = Arr.flatMap(R.toEntries(icons), ([, markup]) =>
      Arr.filter(drawn(markup), (element) => !Arr.contains(PAINTED, element)),
    );
    expect(unmeasured).toEqual([]);
  });

  it("gives no two names the same geometry", () => {
    // The copy-paste bug: adding `save` by duplicating `download` compiles,
    // passes every structural check, and paints the wrong glyph under the new
    // name — so a consumer asking for one icon gets another.
    const groups = Arr.groupBy(R.toEntries(icons), ([, markup]) => markup);
    const shared = Arr.filter(
      R.values(groups),
      (group) => Arr.length(group) > 1,
    );
    expect(
      Arr.map(shared, (group) => Arr.map(group, ([name]) => name)),
    ).toEqual([]);
  });

  it("declares exactly as many names as it has icons", () => {
    expect(R.keys(icons)).toHaveLength(ICON_NAMES.length);
  });
});

describe("icon names", () => {
  it("is sorted, so a generated icon index is stable", () => {
    expect([...ICON_NAMES]).toEqual(Arr.sort(ICON_NAMES, Order.String));
  });

  it("has a registry entry for every declared name", () => {
    const missing = Arr.filter(ICON_NAMES, (name) => !R.has(icons, name));
    expect(missing).toEqual([]);
  });
});
