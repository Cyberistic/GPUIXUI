/**
 * Holds the `drawer-lifecycle` fixture, the probe that drives it and the
 * section the README records it in.
 *
 * The gap this guards: the shipped `Drawer` is the modal whose edge, veil and
 * dismissal are all paint and hit-testing, and its own suite only reaches the
 * offscreen renderer. The probe's expected boxes are the component's arithmetic
 * copied into `drawer.ts`, so this suite reads the size tables back out of
 * `drawer.tsx` and fails here — rather than in a window — when the component
 * moves them. The README count is derived from the probe's own assertion sites,
 * so a check added without the sentence (or the sentence edited alone) fails.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own component, probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";
import {
  DRAWER_HEIGHTS,
  DRAWER_IDS,
  DRAWER_WIDTHS,
  boxText,
  drawerBox,
  drawerFlow,
  drawerReadout,
  initialDrawerFlow,
} from "./drawer.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");
const component = read("../../../../packages/components/src/drawer.tsx");

/** The numbers in one `const NAME = { sm: …, md: …, lg: … }` table. */
const sizeTableIn = (name: string): Record<string, number> => {
  const block = new RegExp(
    `const ${name}: Readonly<Record<DrawerSize, number>> = \\{([^}]*)\\}`,
  ).exec(component);
  const entries = [...(block?.[1] ?? "").matchAll(/(sm|md|lg):\s*(\d+)/g)].map(
    (match) => [match[1] ?? "", Number(match[2])] as const,
  );
  return Object.fromEntries(entries);
};

/** This probe's steps, so a count cannot be read out of another probe. */
const stepsOf = (): string => {
  const start = scenarios.indexOf("const drawerSteps");
  const end = scenarios.indexOf("const surfaceFadeSteps", start);
  return start === -1 || end === -1 ? "" : scenarios.slice(start, end);
};

/** This probe's README section, so a value printed elsewhere cannot pass. */
const sectionOf = (): string => {
  const heading = "### `drawer-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n### ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

describe("the component's own sizes", () => {
  it("names the column widths and sheet heights drawer.tsx declares", () => {
    expect(sizeTableIn("WIDTH")).toEqual({ ...DRAWER_WIDTHS });
    expect(sizeTableIn("HEIGHT")).toEqual({ ...DRAWER_HEIGHTS });
  });

  it("paints the backdrop under the id the probe addresses", () => {
    expect(component).toContain('testId="drawer-backdrop"');
    expect(component).toContain('testId = "drawer-content"');
    expect(component).toContain('testId="drawer-close"');
  });
});

describe("the expected boxes", () => {
  const window = { width: 900, height: 520 };

  it("sits a column against the edge it names", () => {
    expect(drawerBox("right", "md", window)).toEqual({
      x: 500,
      y: 0,
      width: 400,
      height: 520,
    });
    expect(drawerBox("right", "lg", window)).toEqual({
      x: 340,
      y: 0,
      width: 560,
      height: 520,
    });
    expect(drawerBox("left", "md", window)).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 520,
    });
  });

  it("lays a sheet against the bottom edge at the window's width", () => {
    expect(drawerBox("bottom", "lg", window)).toEqual({
      x: 0,
      y: 100,
      width: 900,
      height: 420,
    });
  });

  it("clamps a surface larger than the window to the window", () => {
    const small = { width: 300, height: 200 };
    expect(drawerBox("right", "lg", small)).toEqual({
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
    expect(drawerBox("bottom", "lg", small)).toEqual({
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
  });

  it("spells a box as one comparable line", () => {
    expect(boxText(drawerBox("left", "sm", window))).toBe("0,0,320,520");
  });
});

describe("the caller's state", () => {
  it("counts every open and every close, whichever path sent it", () => {
    const opened = drawerFlow(initialDrawerFlow, "open");
    expect(drawerReadout(opened)).toBe(
      "open=true opens=1 closes=0 side=right size=md dismissible=true",
    );
    const closed = drawerFlow(opened, "close");
    expect(drawerReadout(closed)).toBe(
      "open=false opens=1 closes=1 side=right size=md dismissible=true",
    );
  });

  it("moves the edge, the size and the dismissal rule without touching a count", () => {
    const moved = Arr.reduce(
      [
        "side-left",
        "side-bottom",
        "size-sm",
        "size-lg",
        "dismissible-off",
      ] as const,
      initialDrawerFlow,
      drawerFlow,
    );
    expect(drawerReadout(moved)).toBe(
      "open=false opens=0 closes=0 side=bottom size=lg dismissible=false",
    );
  });
});

describe("the probe", () => {
  it("is registered as a modal", () => {
    const entry = liveRegistry.find(
      (candidate) => candidate.id === "drawer-lifecycle",
    );
    expect(entry?.capability).toBe("modal");
  });

  it("is mounted by the live runner with the shipped parts", () => {
    expect(scenarios).toContain('"drawer-lifecycle": {');
    expect(scenarios).toContain("view: () => <DrawerProbe />");
    expect(scenarios).toContain("steps: drawerSteps");
    expect(scenarios).toContain("<Drawer");
    expect(scenarios).toContain("<DrawerContent");
    expect(scenarios).toContain(`testId={DRAWER_IDS.surface}`);
    expect(scenarios).toContain("dismissible={flow.dismissible}");
  });

  it("reads its ids from the fixture rather than repeating strings", () => {
    const ids = Object.values(DRAWER_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    expect(scenarios).toContain("DRAWER_IDS.opener");
    expect(scenarios).toContain("DRAWER_IDS.surface");
  });

  it("counts the checks the probe can assert", () => {
    const sites = Arr.length(
      Arr.fromIterable(stepsOf().matchAll(/ctx\.expect\w+\(/g)),
    );
    expect(sites).toBe(34);
  });
});

describe("the record", () => {
  it("documents the probe under the version it was measured on", () => {
    const section = sectionOf();
    expect(section).not.toBe("");
    expect(section).toContain("34 checks");
    expect(section).toContain("`--only drawer-lifecycle`");
  });

  it("prints the boxes the fixture derives", () => {
    const section = sectionOf();
    const window = { width: 900, height: 520 };
    expect(section).toContain(boxText(drawerBox("right", "md", window)));
    expect(section).toContain(boxText(drawerBox("right", "lg", window)));
    expect(section).toContain(boxText(drawerBox("left", "md", window)));
    expect(section).toContain(boxText(drawerBox("bottom", "lg", window)));
  });

  it("names the dismissal rule and the component it measures", () => {
    const section = sectionOf();
    expect(section).toContain("`Drawer`");
    expect(section).toContain("dismissible=false");
    expect(section).toContain("src/live/drawer.ts");
  });

  it("names the probe among those measured alone", () => {
    const start = readme.indexOf("Measured alone since then:");
    const clause = readme.slice(start, readme.indexOf("(", start));
    expect(clause).toContain("`drawer-lifecycle`");
  });
});
