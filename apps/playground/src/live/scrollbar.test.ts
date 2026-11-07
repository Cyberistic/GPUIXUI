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
  SCROLLBAR_HORIZONTAL,
  SCROLLBAR_HORIZONTAL_SCROLLED_BY,
  SCROLLBAR_HORIZONTAL_STOP,
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
  trackOf,
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

    expect(
      Option.getOrUndefined(thumbOf(track, 2_000, 0))?.length,
    ).toBeLessThan(Option.getOrUndefined(thumbOf(track, 500, 0))?.length ?? 0);
  });

  it("puts the same share on the horizontal axis, measured by width", () => {
    expect(trackOf("horizontal")).toBe(SCROLLBAR_VIEWPORT.width);
    expect(trackOf("vertical")).toBe(SCROLLBAR_VIEWPORT.height);
    expect(
      thumbOf(trackOf("horizontal"), SCROLLBAR_HORIZONTAL.content, 0),
    ).toEqual(Option.some({ start: 0, length: 68 }));
    expect(
      thumbOf(
        trackOf("horizontal"),
        SCROLLBAR_HORIZONTAL.content,
        -SCROLLBAR_HORIZONTAL_SCROLLED_BY,
      ),
    ).toEqual(Option.some({ start: 104, length: 68 }));
  });

  it("floors a thumb at the minimum, and never past its track", () => {
    expect(thumbOf(track, SCROLLBAR_FLOOR_CONTENT, 0)).toEqual(
      Option.some({ start: 0, length: SCROLLBAR_MIN_THUMB }),
    );

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

    expect((end?.start ?? 0) + (end?.length ?? 0)).toBe(track);
    expect(thumbOf(track, SCROLLBAR_TINTED.content, -100_000)).toEqual(
      Option.some({ start: 134, length: 26 }),
    );

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
        axis: "vertical",
        tint: SCROLLBAR_TINTED.tint,
        box: { x: 250, y: 0, width: 10, height: 26 },
      },
      {
        id: SCROLLBAR_IDS.wide,
        axis: "vertical",
        tint: SCROLLBAR_WIDE.tint,
        box: { x: 242, y: 0, width: 18, height: 51 },
      },
      {
        id: SCROLLBAR_IDS.floor,
        axis: "vertical",
        tint: SCROLLBAR_FLOOR.tint,
        box: { x: 250, y: 0, width: 10, height: SCROLLBAR_MIN_THUMB },
      },
      {
        id: SCROLLBAR_IDS.horizontal,
        axis: "horizontal",
        tint: SCROLLBAR_HORIZONTAL.tint,
        box: { x: 0, y: 150, width: 68, height: 10 },
      },
      {
        id: SCROLLBAR_IDS.default,
        axis: "vertical",
        tint: Option.none(),
        box: { x: 254, y: 0, width: SCROLLBAR_DEFAULT_WIDTH, height: 26 },
      },
    ]);

    expect(Arr.map(SCROLLBAR_THUMBS, (thumb) => thumb.id)).not.toContain(
      SCROLLBAR_SHORT.id,
    );
    expect(Arr.map(SCROLLBAR_TINTED_THUMBS, (thumb) => thumb.id)).toEqual([
      SCROLLBAR_IDS.tinted,
      SCROLLBAR_IDS.wide,
      SCROLLBAR_IDS.floor,
      SCROLLBAR_IDS.horizontal,
    ]);

    const horizontal = Arr.findFirst(
      SCROLLBAR_THUMBS,
      (thumb) => thumb.id === SCROLLBAR_IDS.horizontal,
    );
    expect(Option.map(horizontal, (thumb) => thumb.box)).toEqual(
      Option.some({ x: 0, y: 150, width: 68, height: 10 }),
    );
  });

  it("mounts one scroller per case and one control that fits", () => {
    expect(Arr.map(SCROLLBAR_VIEWPORTS, (scroller) => scroller.id)).toEqual([
      SCROLLBAR_IDS.tinted,
      SCROLLBAR_IDS.wide,
      SCROLLBAR_IDS.short,
      SCROLLBAR_IDS.floor,
      SCROLLBAR_IDS.horizontal,
      SCROLLBAR_IDS.default,
    ]);

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

  it("predicts the sideways wheel on the width", () => {
    expect(Option.isSome(SCROLLBAR_HORIZONTAL_STOP)).toBe(true);
    expect(
      Option.map(SCROLLBAR_HORIZONTAL_STOP, (stop) => ({
        delta: stop.delta,
        offset: stop.offset,
        start: stop.thumb.start,
        length: stop.thumb.length,
      })),
    ).toEqual(
      Option.some({
        delta: -SCROLLBAR_HORIZONTAL_SCROLLED_BY,
        offset: -SCROLLBAR_HORIZONTAL_SCROLLED_BY,
        start: 104,
        length: 68,
      }),
    );
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
        4 +
        2 +
        4,
    );
    expect(SCROLLBAR_CHECKS).toBe(72);
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
    const rules = Arr.map(SCROLLBAR_THUMBS, (thumb) =>
      thumb.axis === "horizontal" ? thumb.box.width : thumb.box.height,
    );
    const reads = Arr.map(rules, (length) => length - 1);
    expect(flat).toContain(
      `The resting thumbs read ${Arr.map(reads, (read) => `**${read}**`).join(
        ", ",
      )} px long against rules of ${Arr.map(
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

    expect(flat).toContain(
      `One \`-${SCROLLBAR_SCROLLED_BY}\` wheel moves the offset to \`-${SCROLLBAR_SCROLLED_BY}\` and the start to 64`,
    );
    expect(flat).toContain("`scrollbar-short` paints none of its tint");

    const sideways = Option.getOrUndefined(SCROLLBAR_HORIZONTAL_STOP);
    expect(sideways).toBeDefined();
    const start = sideways?.thumb.start ?? 0;
    const length = sideways?.thumb.length ?? 0;
    expect(flat).toContain(
      `the horizontal scroller, one \`-${SCROLLBAR_HORIZONTAL_SCROLLED_BY}\` wheel on \`x\` | \`-${SCROLLBAR_HORIZONTAL_SCROLLED_BY}\` | **${start}** | the thumb reads from **${
        start + 0.5
      }** to **${start + 0.5 + (length - 1)}** along the width`,
    );
  });

  it("states the three negative controls it measured", () => {
    expect(flat).toContain(
      "painting `scrollbar-floor` eight pixels thick fails `scrollbar-floor's thumb is the thickness it asks for` (`expected 10 ± 1, got 8`)",
    );
    expect(flat).toContain(
      "dropping the rule's minimum fails `scrollbar-floor's thumb is the length its content gives it` (`expected 3 ± 1, got 19`)",
    );
    expect(flat).toContain(
      "mounting the horizontal case as a **vertical** scroller",
    );
    expect(flat).toContain(
      "fails `the scrollbar-horizontal thumb paints the tint it asks for` (`expected a value, got none`)",
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

    expect(liveScenarios).toContain(
      "scrollbarColor={Option.getOrUndefined(scroller.tint)}",
    );
    expect(liveScenarios).toContain(
      "scrollbarWidth={Option.getOrUndefined(scroller.width)}",
    );

    expect(liveScenarios).toContain("axis={scroller.axis}");
    expect(liveScenarios).toContain(
      'scroller.axis === "horizontal"\n            ? {',
    );
    expect(liveScenarios).toContain("viewportTestId={scroller.id}");
    expect(liveScenarios).toContain("backgroundColor: theme.colors.scrollbar");
    expect(liveScenarios).toMatch(/Effect\.forEach\(\s*SCROLLBAR_STOPS/);
    expect(liveScenarios).toMatch(
      /Effect\.forEach\(\s*SCROLLBAR_TINTED_THUMBS/,
    );
  });

  it("reads the paint the shipped ScrollArea hands the runtime", () => {
    expect(scrollArea).toContain(
      'scrollbarColor: scrollbarColor ?? colorRole(theme, "scrollbar")',
    );
    expect(scrollArea).toContain(
      "viewport.scrollbarWidth = scrollbarWidth ?? part.scrollbarWidth",
    );
    expect(scrollArea).toContain(
      "if ((scrollbarWidth ?? part.scrollbarWidth) !== undefined)",
    );
  });
});
