import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  closedTip,
  describeTip,
  reducedTipTiming,
  tipAfter,
  tipTiming,
  type TipEvent,
  type TipState,
  type TipTiming,
} from "./tooltip-preview";

const runtime = new URL(
  "../../../../../packages/primitives/node_modules/@gpuix/react/dist/components/tooltip.js",
  import.meta.url,
);

const tooltipSource = (): string => readFileSync(runtime, "utf8");

const page = new URL(
  "../../../content/docs/components/tooltip.mdx",
  import.meta.url,
);

const component = new URL(
  "../../../../../packages/primitives/src/components/Tooltip.tsx",
  import.meta.url,
);

const presence = new URL(
  "../../../../../packages/primitives/src/core/presence.ts",
  import.meta.url,
);

const housePresence = new URL(
  "../../../../../packages/motion/src/presence.ts",
  import.meta.url,
);

const motionTiming = new URL(
  "../../../../../packages/motion/src/timing.ts",
  import.meta.url,
);

const read = (url: URL): string => readFileSync(url, "utf8");

const apiRows = (): ReadonlyArray<string> => {
  const source = read(page);
  const start = source.indexOf("## API reference");
  const end = source.indexOf("\n## ", start + 1);
  return source
    .slice(start, end === -1 ? undefined : end)
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .map((line) => line.replace(/^\|/, "").split("|")[0]?.trim() ?? "")
    .filter((cell) => cell !== "" && cell !== "Prop" && !cell.startsWith("---"))
    .map((cell) => cell.replace(/`/g, ""));
};

const declaredProps = (): ReadonlyArray<string> => {
  const source = read(component);
  const start = source.indexOf("export interface TooltipProps {");
  const end = source.indexOf("\n}", start);
  const body = source.slice(start, end === -1 ? undefined : end);
  return [...body.matchAll(/readonly ([A-Za-z]+)\??:/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
};

const slow: TipTiming = {
  delay: 600,
  closeGrace: 80,
  skipDelay: 300,
  exitWindow: 160,
};

const run = (
  events: ReadonlyArray<TipEvent>,
  timing: TipTiming = slow,
): TipState =>
  events.reduce<TipState>(
    (state, event) => tipAfter(state, event, timing),
    closedTip,
  );

const opened = tipAfter(
  tipAfter(closedTip, { type: "enter" }, slow),
  { type: "elapsed" },
  slow,
);

describe("the tooltip preview", () => {
  it("reads the clock off the runtime's own tooltip", () => {
    const source = tooltipSource();
    const delay = /delayDuration = (\d+)/.exec(source)?.[1];
    const grace = /setTimeout\(close, (\d+)\)/.exec(source)?.[1];
    const skip = /skipDelayDuration = (\d+)/.exec(source)?.[1];

    expect([delay, grace, skip]).toEqual(["0", "80", "300"]);
    expect({
      delay: tipTiming.delay,
      closeGrace: tipTiming.closeGrace,
      skipDelay: tipTiming.skipDelay,
    }).toEqual({
      delay: Number(delay),
      closeGrace: Number(grace),
      skipDelay: Number(skip),
    });

    expect(source).toContain("onFocus: (event) => {");
    expect(source).toContain("context.openImmediately()");
  });

  it("opens at once at the provider's delay, and waits when one is set", () => {
    const immediate = tipAfter(closedTip, { type: "enter" }, tipTiming);
    expect(immediate).toEqual({
      open: false,
      held: false,
      leaving: false,
      timer: { after: 0, kind: "open" },
    });
    expect(tipAfter(immediate, { type: "elapsed" }, tipTiming).open).toBe(true);

    const delayed = tipAfter(closedTip, { type: "enter" }, slow);
    expect(delayed.timer).toEqual({ after: 600, kind: "open" });
    expect(tipAfter(delayed, { type: "elapsed" }, slow).open).toBe(true);
  });

  it("skips the delay when the pointer returns inside the reopen window", () => {
    const returned = tipAfter(
      closedTip,
      { type: "enter", recentlyClosed: true },
      slow,
    );

    expect(returned.timer).toEqual({ after: 0, kind: "open" });
  });

  it("gives a leaving pointer the grace, and the tip cancels it", () => {
    const leaving = tipAfter(opened, { type: "leave" }, slow);

    expect(leaving).toEqual({
      open: true,
      held: false,
      leaving: false,
      timer: { after: 80, kind: "grace" },
    });
    expect(describeTip(leaving, slow)).toContain("closes it in 80 ms");

    expect(tipAfter(leaving, { type: "enter-tip" }, slow).timer).toBeNull();

    const gone = tipAfter(leaving, { type: "elapsed" }, slow);
    expect(gone.open).toBe(false);

    expect(gone.leaving).toBe(true);
  });

  it("holds the tip shut after a press until the pointer leaves", () => {
    const pressed = tipAfter(opened, { type: "press" }, slow);

    expect(pressed).toEqual({
      open: false,
      held: true,
      leaving: true,
      timer: { after: 160, kind: "exit" },
    });

    expect(describeTip(tipAfter(pressed, { type: "elapsed" }, slow))).toContain(
      "must leave",
    );

    expect(tipAfter(pressed, { type: "enter" }, slow)).toBe(pressed);
    expect(tipAfter(pressed, { type: "leave" }, slow).held).toBe(false);
  });

  it("keeps a dismissed tip painted for its exit, then releases it", () => {
    const leaving = tipAfter(opened, { type: "escape" }, slow);
    expect(describeTip(leaving, slow)).toBe(
      "leaving — 160 ms until it unmounts",
    );

    expect(tipAfter(leaving, { type: "enter-tip" }, slow)).toBe(leaving);
    expect(tipAfter(leaving, { type: "elapsed" }, slow)).toEqual({
      open: false,
      held: true,
      leaving: false,
      timer: null,
    });
  });

  it("retargets the same box when a leaving tip reopens", () => {
    const leaving = run(
      [
        { type: "enter" },
        { type: "elapsed" },
        { type: "leave" },
        { type: "elapsed" },
      ],
      slow,
    );
    expect(leaving.leaving).toBe(true);

    const reopening = tipAfter(leaving, { type: "enter" }, slow);
    expect(reopening.leaving).toBe(true);
    expect(tipAfter(reopening, { type: "elapsed" }, slow)).toEqual({
      open: true,
      held: false,
      leaving: false,
      timer: null,
    });
  });

  it("unmounts at once when the reader asked for less motion", () => {
    const pressed = tipAfter(opened, { type: "press" }, reducedTipTiming);
    expect(pressed).toEqual({
      open: false,
      held: true,
      leaving: false,
      timer: null,
    });

    expect(
      tipAfter(
        tipAfter(closedTip, { type: "enter" }, reducedTipTiming),
        { type: "elapsed" },
        reducedTipTiming,
      ).open,
    ).toBe(true);
  });

  it("opens on focus immediately, whatever the delay is", () => {
    expect(tipAfter(closedTip, { type: "focus" }, slow).open).toBe(true);
    expect(tipAfter(opened, { type: "blur" }, slow)).toEqual({
      open: false,
      held: false,
      leaving: true,
      timer: { after: 160, kind: "exit" },
    });
  });

  it("leaves the tip alone when a traversal reaches the trigger", () => {
    expect(run([{ type: "traversal" }])).toEqual(closedTip);
    expect(run([{ type: "traversal" }, { type: "escape" }])).toEqual(closedTip);
  });

  it("words the state a reader can watch", () => {
    expect(describeTip(closedTip)).toBe("closed");
    expect(
      describeTip(tipAfter(closedTip, { type: "enter" }, slow), slow),
    ).toBe("opening in 600 ms");
    expect(describeTip(opened, slow)).toBe(
      "open — a press or Escape closes it",
    );
  });

  it("reads the exit window and travel off the wrapper that paints them", () => {
    const source = read(component);
    const seam = read(presence);
    const house = read(housePresence);

    expect(source).toContain("const TOOLTIP_OFFSET = 2;");
    expect(source).toContain("const reducedMotion = reducedMotionOf(");
    expect(source).toContain("useMotionPreference(),");
    expect(source).toContain("surfaceTiming(reducedMotion)");
    expect(source).toContain("exitWindowMs(timing)");
    expect(source).toContain("presenceStyle(view.present)");
    expect(source).toContain(
      "fadeFromAnchor(side, TOOLTIP_OFFSET), wanted, timing",
    );

    expect(house).toContain('pointerEvents: present ? "auto" : "none"');
    expect(house).toContain(
      'motionTiming(level, { phase: "exit", preference })',
    );

    expect(house).toContain(
      "transitionWindowMs(presenceTimingOf(timing).exit)",
    );
    expect(house).toContain("export const presenceTimingOf");
    expect(seam).toContain("presenceStyle");
    expect(seam).toContain("surfaceTiming");
    expect(read(motionTiming)).toContain("fast: 160");

    expect(tipTiming.exitWindow).toBe(160);
    expect(reducedTipTiming.exitWindow).toBe(0);
  });

  it("prints the motion the component paints, and documents every prop", () => {
    expect(declaredProps().filter((prop) => !apiRows().includes(prop))).toEqual(
      [],
    );
  });
});
