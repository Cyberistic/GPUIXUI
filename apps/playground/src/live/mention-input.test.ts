/**
 * Holds `mention-input-lifecycle` to the shipped component and to its own
 * arithmetic.
 *
 * The gap this guards: every `MentionInput` rule was a renderer read — the
 * `aria-selected` row, the draft the host held, a synthetic press — and no
 * window had placed the floating list under the field, found the highlighted
 * row's accent fill in a frame, or pressed a row of the layer the way a pointer
 * does. The probe's rows are the component's own parts and its paint claim is
 * the component's `theme.colors.accent`; if the list moves to another side, the
 * row stops painting the accent, or the probe is rewritten around a local grid,
 * the registry, the README and the inventory row would still claim the library's
 * `MentionInput` while the window measured the fixture.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe, component and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  AT_KEY,
  DISMISS_QUERY,
  FIRST_INSERTION,
  listId,
  MENTION_ACCENT_FLOOR,
  MENTION_IDS,
  MENTION_PEOPLE,
  mentionReadout,
  PRESS_QUERY,
  PRESSED_INSERTION,
  ROW_INSET,
  rowId,
  rowRegion,
  SECOND_INSERTION,
  SECOND_QUERY,
} from "./mention-input.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./mention-input-probe.tsx");
const mention = read("../../../../packages/components/src/mention-input.tsx");
const readme = read("../../README.md");

/** The checks the probe asserts: one per `ctx.expect*` site, and no loops. */
const checks = probe.match(/ctx\.expect[A-Za-z]*\(/g)?.length ?? 0;

/** The probe's README section, so a value printed elsewhere cannot pass. */
const section = (() => {
  const heading = "### `mention-input-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.slice(start).search(/\n#{2,3} /);
  return end === -1 ? readme.slice(start) : readme.slice(start, start + end);
})();

describe("the mention input scene's arithmetic", () => {
  it("prints the one readout shape every state is checked against", () => {
    expect(mentionReadout({ text: "", mentions: 0 })).toBe(
      "text=[] mentions=0",
    );
    // The brackets keep the trailing space `applyMention` writes visible.
    expect(mentionReadout({ text: FIRST_INSERTION, mentions: 1 })).toBe(
      "text=[@grace ] mentions=1",
    );
    expect(mentionReadout({ text: PRESSED_INSERTION, mentions: 3 })).toBe(
      "text=[@grace @alan @margaret ] mentions=3",
    );
  });

  it("names the people the queries select, in the list's ranking order", () => {
    expect(Arr.map(MENTION_PEOPLE, (person) => person.value)).toEqual([
      "ada",
      "grace",
      "alan",
      "margaret",
    ]);
    expect(
      Arr.dedupe(Arr.map(MENTION_PEOPLE, (person) => person.label)),
    ).toHaveLength(MENTION_PEOPLE.length);
    // `al` is a prefix of `alan` only, and `m` starts no other name.
    expect(
      Arr.filter(MENTION_PEOPLE, (person) =>
        person.value.startsWith(SECOND_QUERY),
      ),
    ).toEqual([{ value: "alan", label: "Alan Turing" }]);
    expect(
      Arr.filter(MENTION_PEOPLE, (person) =>
        person.value.startsWith(PRESS_QUERY),
      ),
    ).toEqual([{ value: "margaret", label: "Margaret Hamilton" }]);
    expect(
      Arr.filter(MENTION_PEOPLE, (person) =>
        person.value.startsWith(DISMISS_QUERY),
      ),
    ).toEqual([{ value: "grace", label: "Grace Hopper" }]);
    expect(SECOND_INSERTION).toBe(`${FIRST_INSERTION}@alan `);
    expect(PRESSED_INSERTION).toBe(`${SECOND_INSERTION}@margaret `);
  });

  it("addresses each field's list and rows without a collision", () => {
    expect(MENTION_IDS.frame).toBe("mi-frame");
    expect(listId(MENTION_IDS.enabled)).toBe("mi-field-list");
    expect(listId(MENTION_IDS.disabled)).toBe("mi-disabled-list");
    expect(rowId(MENTION_IDS.enabled, "ada")).toBe("mi-field-row-ada");
    expect(AT_KEY).toBe("2->@");
  });

  it("crops a row's inner square so a rounded corner cannot be counted", () => {
    // A 194 × 22-point inner square at this host's 2x scale.
    const region = rowRegion({ x: 100, y: 200, width: 200, height: 28 }, 2);
    expect({
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height,
    }).toEqual({
      x: (100 + ROW_INSET) * 2,
      y: (200 + ROW_INSET) * 2,
      width: (200 - 2 * ROW_INSET) * 2,
      height: (28 - 2 * ROW_INSET) * 2,
    });
    // The floor is below a whole fill and far above a corner's fringe.
    expect(MENTION_ACCENT_FLOOR).toBeLessThan(region.width * region.height);
    expect(MENTION_ACCENT_FLOOR).toBeGreaterThan(200);
  });

  it("counts the checks the probe asserts", () => {
    expect(checks).toBe(24);
  });
});

describe("the mention-input-lifecycle probe's record", () => {
  it("registers the probe once, over the input capability", () => {
    const entries = Arr.filter(
      liveRegistry,
      (entry) => entry.id === "mention-input-lifecycle",
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.capability).toBe("input");
    expect(entries[0]?.title).toContain("MentionInput");
  });

  it("documents it under the version it was measured on", () => {
    expect(section).not.toBe("");
    const printed = Number(
      /(\d+) checks, `--only mention-input-lifecycle`/.exec(section)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(checks);
  });

  it("prints the scene and the readings the window measured", () => {
    // A page that printed only fixture constants would claim no measurement.
    expect(section).toContain("one **4-point** gap below");
    expect(section).toContain("accent");
    expect(section).toContain("mentions=3");
    expect(section).toContain("`2->@`");
    expect(section).toContain("Margaret Hamilton");
    expect(section).toContain("mentions=0");
  });
});

describe("the probe mounts the shipped mention field", () => {
  it("composes the package's parts instead of a local suggestion grid", () => {
    expect(probe).toContain('} from "@gpuixui/components"');
    expect(probe).toContain("<MentionInput");
    expect(probe).toContain("<MentionInputList");
    expect(probe).toContain("<MentionInputItem");
    expect(probe).toContain("palettes.dark");
    expect(probe).not.toContain('role="button"');
  });

  it("drives the window's own keys and pointer at the layer", () => {
    expect(probe).toContain("ctx.host.key(AT_KEY)");
    expect(probe).toContain('ctx.host.key("down")');
    expect(probe).toContain('ctx.host.key("enter")');
    expect(probe).toContain('ctx.host.key("escape")');
    expect(probe).toContain('ctx.host.clickText("Margaret Hamilton")');
  });

  it("reads the accent fill the component paints and the press it listens for", () => {
    expect(mention).toContain(
      "backgroundColor: highlighted ? theme.colors.accent : undefined",
    );
    expect(mention).toContain("onMouseDown={() => select(value)}");
    expect(mention).toContain('side="bottom"');
    expect(mention).toContain("sideOffset={4}");
  });
});
