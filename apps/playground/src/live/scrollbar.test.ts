/**
 * Holds the arithmetic the `scrollbar-thumb` probe reads a window with, and the
 * claims its README section prints.
 *
 * The thumb is the runtime's own paint: the binding sizes it from the track and
 * the content, positions it from the offset and rounds both caps, so every
 * number a plan leans on — how long a thumb is, where it starts, whether one is
 * painted at all — is either arithmetic here or a crop of the frame. The window
 * measured **25** px tall for a rule that predicts 26, which is why the section
 * prints the rule and the capture's one-pixel read side by side rather than
 * pretending they are the same number.
 *
 * `node:fs` is deliberate, as in `flex-sizing.test.ts` and `registry.test.ts`:
 * this reads the repository's own probe, painter and Markdown, never a runtime
 * path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";
import {
  maxOffset,
  SCROLLBAR_CHECKS,
  SCROLLBAR_DEFAULT,
  SCROLLBAR_DEFAULT_WIDTH,
  SCROLLBAR_FLOOR,
  SCROLLBAR_FLOOR_CONTENT,
  SCROLLBAR_IDS,
  SCROLLBAR_MIN_THUMB,
  SCROLLBAR_SCROLLED_BY,
  SCROLLBAR_SHORT,
  SCROLLBAR_STOPS,
  SCROLLBAR_THUMBS,
  SCROLLBAR_TINTED,
  SCROLLBAR_TINTED_THUMBS,
  SCROLLBAR_VIEWPORT,
  SCROLLBAR_VIEWPORTS,
  SCROLLBAR_WIDE,
  thumbOf,
} from "./scrollbar.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const liveScenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

const scrollArea = readFileSync(
  new URL(
    "../../../../packages/primitives/src/components/ScrollArea.tsx",
    import.meta.url,
  ),
  "utf8",
);

/** The section's prose on one line, so a wrapped sentence still reads whole. */
const flat = readme.replace(/\s+/g, " ");

const track = SCROLLBAR_VIEWPORT.height;

describe("the thumb the runtime paints", () => {
  it("sizes a thumb to the viewport's share of the content", () => {
    expect(thumbOf(track, SCROLLBAR_TINTED.content, 0)).toEqual(
      Option.some({ start: 0, length: 26 }),
    );
    expect(thumbOf(track, SCROLLBAR_WIDE.content, 0)).toEqual(
      Option.some({ start: 0, length: 51 }),
    );
    // Twice the content is roughly half the thumb: a length is a share, not a
    // bar the runtime draws at a fixed height.
    expect(
      Option.getOrUndefined(thumbOf(track, 2_000, 0))?.length,
    ).toBeLessThan(Option.getOrUndefined(thumbOf(track, 500, 0))?.length ?? 0);
  });

  it("floors a thumb at the minimum, and never past its track", () => {
    expect(thumbOf(track, SCROLLBAR_FLOOR_CONTENT, 0)).toEqual(
      Option.some({ start: 0, length: SCROLLBAR_MIN_THUMB }),
    );
    // A track shorter than the minimum cannot paint a longer thumb than itself.
    expect(thumbOf(10, SCROLLBAR_FLOOR_CONTENT, 0)).toEqual(
      Option.some({ start: 0, length: 10 }),
    );
  });

  it("moves the thumb with the offset and clamps at both ends", () => {
    expect(
      thumbOf(track, SCROLLBAR_TINTED.content, -SCROLLBAR_SCROLLED_BY),
    ).toEqual(Option.some({ start: 64, length: 26 }));
    const end = Option.getOrUndefined(
      thumbOf(
        track,
        SCROLLBAR_TINTED.content,
        -maxOffset(SCROLLBAR_TINTED.content, track),
      ),
    );
    expect(end).toEqual({ start: 134, length: 26 });
    // The end of the travel is the end of the track: a thumb that stopped a
    // point early would leave a sliver of travel the reader cannot reach.
    expect((end?.start ?? 0) + (end?.length ?? 0)).toBe(track);
    expect(thumbOf(track, SCROLLBAR_TINTED.content, -100_000)).toEqual(
      Option.some({ start: 134, length: 26 }),
    );
    // The other direction clamps too, so a rubber-banded offset cannot lift the
    // thumb out of its track.
    expect(thumbOf(track, SCROLLBAR_TINTED.content, 50)).toEqual(
      Option.some({ start: 0, length: 26 }),
    );
  });

  it("paints no thumb for content that fits", () => {
    expect(Option.isNone(thumbOf(track, SCROLLBAR_SHORT.content, 0))).toBe(
      true,
    );
    expect(Option.isNone(thumbOf(track, track, 0))).toBe(true);
    expect(Option.isNone(thumbOf(0, SCROLLBAR_TINTED.content, 0))).toBe(true);
  });
});

describe("the scrollbar case table", () => {
  it("derives every resting thumb from its own constants", () => {
    expect(SCROLLBAR_THUMBS).toEqual([
      {
        id: SCROLLBAR_IDS.tinted,
        tint: SCROLLBAR_TINTED.tint,
        box: { x: 250, y: 0, width: 10, height: 26 },
      },
      {
        id: SCROLLBAR_IDS.wide,
        tint: SCROLLBAR_WIDE.tint,
        box: { x: 242, y: 0, width: 18, height: 51 },
      },
      {
        id: SCROLLBAR_IDS.floor,
        tint: SCROLLBAR_FLOOR.tint,
        box: { x: 250, y: 0, width: 10, height: SCROLLBAR_MIN_THUMB },
      },
      {
        id: SCROLLBAR_IDS.default,
        tint: Option.none(),
        box: { x: 254, y: 0, width: SCROLLBAR_DEFAULT_WIDTH, height: 26 },
      },
    ]);
    // The control is absent on purpose, and the tinted list is the subset the
    // confinement read can count a colour for.
    expect(Arr.map(SCROLLBAR_THUMBS, (thumb) => thumb.id)).not.toContain(
      SCROLLBAR_SHORT.id,
    );
    expect(Arr.map(SCROLLBAR_TINTED_THUMBS, (thumb) => thumb.id)).toEqual([
      SCROLLBAR_IDS.tinted,
      SCROLLBAR_IDS.wide,
      SCROLLBAR_IDS.floor,
    ]);
  });

  it("mounts one scroller per case and one control that fits", () => {
    expect(Arr.map(SCROLLBAR_VIEWPORTS, (scroller) => scroller.id)).toEqual([
      SCROLLBAR_IDS.tinted,
      SCROLLBAR_IDS.wide,
      SCROLLBAR_IDS.short,
      SCROLLBAR_IDS.floor,
      SCROLLBAR_IDS.default,
    ]);
    // A case whose content fits must be the only one the rule answers nothing
    // for; a table that quietly gained a second would shrink the thumb list.
    expect(
      Arr.filter(SCROLLBAR_VIEWPORTS, (scroller) =>
        Option.isNone(thumbOf(track, scroller.content, 0)),
      ),
    ).toEqual([SCROLLBAR_SHORT]);
    expect(SCROLLBAR_DEFAULT.tint).toEqual(Option.none());
    expect(SCROLLBAR_DEFAULT.width).toEqual(Option.none());
  });

  it("predicts both wheel stops from the same rule", () => {
    expect(
      Arr.map(SCROLLBAR_STOPS, (stop) => [stop.label, stop.delta, stop.offset]),
    ).toEqual([
      ["one wheel", -SCROLLBAR_SCROLLED_BY, -SCROLLBAR_SCROLLED_BY],
      ["past the end", -100_000, -maxOffset(SCROLLBAR_TINTED.content, track)],
    ]);
    expect(Arr.map(SCROLLBAR_STOPS, (stop) => stop.thumb.start)).toEqual([
      64, 134,
    ]);
    expect(Arr.map(SCROLLBAR_STOPS, (stop) => stop.endsAtTrack)).toEqual([
      false,
      true,
    ]);
  });

  it("keeps every locator apart", () => {
    const ids = Object.values(SCROLLBAR_IDS);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("counts the checks the probe asserts", () => {
    expect(SCROLLBAR_CHECKS).toBe(
      1 +
        2 +
        SCROLLBAR_VIEWPORTS.length * 3 +
        SCROLLBAR_THUMBS.length * 5 +
        1 +
        SCROLLBAR_TINTED_THUMBS.length +
        2 +
        SCROLLBAR_STOPS.length * 4 +
        1 +
        2 +
        4,
    );
    expect(SCROLLBAR_CHECKS).toBe(59);
  });
});

describe("the scrollbar-thumb probe's record", () => {
  it("registers the probe with the scroll capability", () => {
    expect(
      Arr.filter(liveRegistry, (probe) => probe.id === "scrollbar-thumb"),
    ).toEqual([
      {
        id: "scrollbar-thumb",
        title: expect.stringContaining("native thumb"),
        capability: "scroll",
      },
    ]);
  });

  it("documents it under the version it was measured on", () => {
    expect(readme).toContain("### `scrollbar-thumb` — measured on 0.11.0 here");
    const printed = Number(
      /(\d+) checks, `--only scrollbar-thumb`/.exec(readme)?.[1] ?? Number.NaN,
    );
    expect(printed).toBe(SCROLLBAR_CHECKS);
  });

  it("prints the lengths the capture read, not only the rule's", () => {
    // The rounded caps hide one point at each end of a solid-colour read, so the
    // section prints the rule and the read together; a page that printed the
    // rule alone would claim a measurement it does not have.
    const rules = Arr.map(SCROLLBAR_THUMBS, (thumb) => thumb.box.height);
    const reads = Arr.map(rules, (length) => length - 1);
    expect(flat).toContain(
      `The resting thumbs read ${Arr.map(reads, (read) => `**${read}**`).join(
        ", ",
      )} px tall against rules of ${Arr.map(
        rules,
        (length) => `**${length}**`,
      ).join(", ")}`,
    );
  });

  it("prints the moves and the clamp the window measured", () => {
    const end = SCROLLBAR_STOPS[SCROLLBAR_STOPS.length - 1];
    expect(end).toBeDefined();
    const bottom = (end?.thumb.start ?? 0) + (end?.thumb.length ?? 0) - 1;
    expect(flat).toContain(
      `a wheel past the end leaves \`-${maxOffset(
        SCROLLBAR_TINTED.content,
        track,
      )}\` and starts the thumb at ${end?.thumb.start}`,
    );
    expect(flat).toContain(
      `whose bottom reads **${bottom}** of the **${track}** px track`,
    );
    // The other stop, and the control's absence, are the two halves a reader
    // checks first.
    expect(flat).toContain(
      `One \`-${SCROLLBAR_SCROLLED_BY}\` wheel moves the offset to \`-${SCROLLBAR_SCROLLED_BY}\` and the start to 64`,
    );
    expect(flat).toContain("`scrollbar-short` paints none of its tint");
  });

  it("states both negative controls it measured", () => {
    expect(flat).toContain(
      "painting `scrollbar-floor` eight pixels thick fails `scrollbar-floor's thumb is the thickness it asks for` (`expected 10 ± 1, got 8`)",
    );
    expect(flat).toContain(
      "dropping the rule's minimum fails `scrollbar-floor's thumb is the length its content gives it` (`expected 3 ± 1, got 19`)",
    );
  });
});

describe("the probe asks the questions the section answers", () => {
  it("mounts the shipped ScrollArea for every case, both knobs passed through", () => {
    expect(liveScenarios).toContain("<ScrollArea");
    Arr.forEach(SCROLLBAR_VIEWPORTS, (scroller) => {
      const field = Arr.findFirst(
        Object.entries(SCROLLBAR_IDS),
        ([, id]) => id === scroller.id,
      );
      expect(field).toBeDefined();
    });
    // Both knobs go through `Some`/`None`, so the default case really is the
    // library's own paint rather than an empty string or a zero width.
    expect(liveScenarios).toContain(
      "scrollbarColor={Option.getOrUndefined(scroller.tint)}",
    );
    expect(liveScenarios).toContain(
      "scrollbarWidth={Option.getOrUndefined(scroller.width)}",
    );
    expect(liveScenarios).toContain("viewportTestId={scroller.id}");
    expect(liveScenarios).toContain("backgroundColor: theme.colors.scrollbar");
    expect(liveScenarios).toMatch(/Effect\.forEach\(\s*SCROLLBAR_STOPS/);
    expect(liveScenarios).toMatch(
      /Effect\.forEach\(\s*SCROLLBAR_TINTED_THUMBS/,
    );
  });

  it("reads the paint the shipped ScrollArea hands the runtime", () => {
    // The fixture's default case claims the theme's `scrollbar` role and the
    // platform's thickness. Both are the component's defaults, not the probe's:
    // it passes no knob for that case, so the painter is what decides.
    expect(scrollArea).toContain(
      "scrollbarColor: scrollbarColor ?? theme.colors.scrollbar",
    );
    expect(scrollArea).toContain(
      "viewport.scrollbarWidth = scrollbarWidth ?? part.scrollbarWidth",
    );
    expect(scrollArea).toContain(
      "if ((scrollbarWidth ?? part.scrollbarWidth) !== undefined)",
    );
  });
});
