import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { components } from "@/component-meta/registry";
import {
  LIVE_SCENES,
  SCENE_GESTURE,
  SCENE_INTERACTION,
  SCENE_TEXT,
  SCENE_TEXT_IS_SCENE_PROSE,
} from "../../../preview/scenes";
import { NO_LIVE_SCENE, STATEFUL_NO_LIVE_SCENE } from "./gaps";

/**
 * Guards the live-scene contract (plan 456) at the two points it can drift
 * silently: the smoke check looks for text the view no longer renders, and an
 * interaction record loses its `liveScene` and falls back to a weaker tier.
 *
 * The view itself cannot be imported here — it is JSX against the GPUix runtime
 * — so the guard reads the real source file, like `content-references.test.ts`.
 */

const viewSource = readFileSync(
  fileURLToPath(new URL("../../../preview/scene-views.tsx", import.meta.url)),
  "utf8",
);

const mainSource = readFileSync(
  fileURLToPath(new URL("../../../preview/main.tsx", import.meta.url)),
  "utf8",
);

const interactionScenes = new Map([
  ["tabs", "tabs"],
  ["dropdown-menu", "dropdown-menu"],
  ["dialog", "dialog"],
  ["popover", "popover"],
  ["command-menu", "command-menu"],
  ["confirm-dialog", "confirm-dialog"],
  ["drawer", "drawer"],
  ["navigation-menu", "navigation-menu"],
  ["mention-input", "mention-input"],
  ["preview-card", "preview-card"],
  ["toast", "toast"],
  ["tooltip", "tooltip"],
  ["context-menu", "context-menu"],
  ["date-picker", "date-picker"],
  ["combobox", "combobox"],
  ["hotkey-input", "hotkey-input"],
  ["select", "select"],
  ["checkbox", "checkbox"],
  ["switch", "switch"],
  ["radio-group", "radio-group"],
  ["slider", "slider"],
  ["range-slider", "range-slider"],
  ["search-input", "search-input"],
  ["text-input", "text-input"],
  ["text-area", "text-area"],
]);

const pagesDirectory = new URL(
  "../../../content/docs/components/",
  import.meta.url,
);

/** The page source for a slug, or an empty string when no page exists yet. */
const pageBody = (slug: string): string => {
  const file = new URL(`${slug}.mdx`, pagesDirectory);
  return existsSync(fileURLToPath(file))
    ? readFileSync(fileURLToPath(file), "utf8")
    : "";
};

/** Whether a component page renders a tier-A illustration. */
const hasIllustration = (slug: string): boolean =>
  pageBody(slug).includes("<ComponentPreview");

describe("live scene table", () => {
  it("has a unique key for every scene", () => {
    expect(new Set(LIVE_SCENES).size).toBe(LIVE_SCENES.length);
  });

  it("gives every scene a non-empty string to look for", () => {
    const missing = LIVE_SCENES.filter(
      (scene) =>
        typeof SCENE_TEXT[scene] !== "string" || SCENE_TEXT[scene].length === 0,
    );
    expect(missing).toEqual([]);
  });

  it("keeps every expectation in the view that renders it", () => {
    const stale = LIVE_SCENES.filter(
      (scene) => !viewSource.includes(SCENE_TEXT[scene]),
    ).map((scene) => `${scene}: ${SCENE_TEXT[scene]}`);
    expect(stale).toEqual([]);
  });

  /**
   * The bug this guards (measured 2026-10-18): four scenes asserted their own
   * `<Text role="h3">` heading, so the smoke stayed green with the Icon,
   * ScrollArea, Skeleton or Spinner missing. `tabs` asserted a string that the
   * trigger list and the panel both render. The expectation must name text the
   * component region paints; a component that paints none needs a written
   * reason, and the set of exemptions is pinned.
   */
  it("looks for text the component paints, not the scene's own heading", () => {
    const headings = [
      ...viewSource.matchAll(/<Text role="h3">([^<]+)<\/Text>/g),
    ].map((match) => match[1]);
    const offenders = LIVE_SCENES.filter(
      (scene) =>
        headings.includes(SCENE_TEXT[scene]) &&
        SCENE_TEXT_IS_SCENE_PROSE[scene] === undefined,
    ).map((scene) => `${scene}: ${SCENE_TEXT[scene]}`);
    expect(offenders).toEqual([]);
    expect(Object.keys(SCENE_TEXT_IS_SCENE_PROSE)).toEqual(["skeleton"]);
  });

  /**
   * The command-menu bug (plan 471): the scene passed `actions` but no
   * children, so it mounted an empty dialog — and the check above still passed
   * because `"Go to Components"` occurs in the actions array the palette never
   * painted. `CommandMenu` renders the parts it is given; data is not a default
   * rendering.
   */
  it("composes the command palette from its parts, not only its actions", () => {
    const scene = viewSource.slice(
      viewSource.indexOf("const CommandMenuScene"),
      viewSource.indexOf("const ConfirmDialogScene"),
    );
    const missing = [
      "<CommandMenuInput",
      "<CommandMenuList",
      "<CommandMenuEmpty",
    ].filter((part) => !scene.includes(part));
    expect(missing).toEqual([]);
  });
});

/**
 * The gesture scenes (plan 486): a component that owns its open state is driven
 * by a real GPUI gesture in the smoke instead of a prop. These guards keep the
 * gesture table, the view it drives and the reader's instruction from drifting.
 */
describe("gesture scenes", () => {
  const gestureScenes = LIVE_SCENES.filter(
    (scene) => SCENE_GESTURE[scene] !== undefined,
  );

  /** The steps that name an element; a text target names a label instead. */
  const testIdSteps = (scene: (typeof LIVE_SCENES)[number]) =>
    (SCENE_GESTURE[scene] ?? []).flatMap((step) =>
      step.kind === "click-text" ? [] : [step],
    );

  /**
   * Targets the component itself renders, so the id cannot occur in the scene
   * source. `DatePickerCalendar` owns one `date-day-<iso>` cell per day; the
   * scene's `today="2026-10-17"` is what puts the 21st in that month. The time
   * picker derives `<testId>-hours` / `-minutes` for its segment inputs from the
   * `testId` the scene hands the root. Pinned, so a stale exemption fails like a
   * stale expectation.
   */
  const componentOwnedTargets: ReadonlyMap<string, readonly string[]> = new Map(
    [
      ["date-picker", ["date-day-2026-10-21"]],
      ["time-picker", ["scene-time-hours"]],
    ],
  );

  it("targets a test id the scene really renders", () => {
    const missing = gestureScenes.flatMap((scene) =>
      testIdSteps(scene).flatMap((step) =>
        viewSource.includes(`testId="${step.testId}"`) ||
        (componentOwnedTargets.get(scene) ?? []).includes(step.testId)
          ? []
          : [`${scene}: ${step.testId}`],
      ),
    );
    expect(missing).toEqual([]);
  });

  /**
   * The radio group's options are data and carry no per-option test id, so its
   * scene targets the option's own painted label, scoped to the control that
   * renders it. The same drift rule applies: a renamed label or scope must fail
   * here rather than in the smoke — and scoping is what keeps the reader's own
   * instruction (which names the option) from matching first.
   */
  it("targets text the scene really renders, inside the control it names", () => {
    // A quoted literal or a JSX child — not a substring of a longer string. A
    // target of "Team plan" would otherwise pass on the literal "Team plan
    // selected" the gesture is supposed to reveal.
    const painted = (text: string): boolean =>
      viewSource.includes(`"${text}"`) || viewSource.includes(`>${text}<`);
    const missing = gestureScenes.flatMap((scene) =>
      (SCENE_GESTURE[scene] ?? []).flatMap((step) =>
        step.kind !== "click-text" ||
        (painted(step.text) && viewSource.includes(`testId="${step.within}"`))
          ? []
          : [`${scene}: ${step.within} / ${step.text}`],
      ),
    );
    expect(missing).toEqual([]);
  });

  it("keeps no unused component-owned exemption", () => {
    const unused = LIVE_SCENES.flatMap((scene) =>
      (componentOwnedTargets.get(scene) ?? [])
        .filter(
          (testId) =>
            !testIdSteps(scene).some((step) => step.testId === testId),
        )
        .map((testId) => `${scene}: ${testId}`),
    );
    expect(unused).toEqual([]);
  });

  it("tells the reader what to do for exactly the scenes that need it", () => {
    const described = LIVE_SCENES.filter(
      (scene) => SCENE_INTERACTION[scene] !== undefined,
    );
    expect(described).toEqual(gestureScenes);
  });

  /**
   * The smoke asserts the expected text is **absent before** the gesture. An
   * instruction that names the text would make a broken scene look explained
   * while the before-check still passes for the wrong reason, and a copy of the
   * text in the instruction would let a scene pass with the component missing.
   */
  it("never names the text the gesture is supposed to reveal", () => {
    const leaked = gestureScenes.filter((scene) => {
      const instruction = SCENE_INTERACTION[scene];
      return (
        instruction !== undefined && instruction.includes(SCENE_TEXT[scene])
      );
    });
    expect(leaked).toEqual([]);
  });
});

describe("interaction records", () => {
  it("declare the live scene that documents them", () => {
    const wrong = [...interactionScenes].flatMap(([slug, scene]) => {
      const record = components.find((entry) => entry.slug === slug);
      return record?.liveScene === scene
        ? []
        : [`${slug}: ${record?.liveScene}`];
    });
    expect(wrong).toEqual([]);
  });

  it("use the scene key as the page slug the smoke derives", () => {
    const wrong = components.flatMap((entry) =>
      entry.liveScene === null || entry.liveScene === entry.slug
        ? []
        : [`${entry.slug}: ${entry.liveScene}`],
    );
    expect(wrong).toEqual([]);
  });

  it("leave a delivered page without live or illustrated preview only for a measured reason", () => {
    const gaps = components.flatMap((entry) =>
      entry.sourcePath !== null &&
      entry.liveScene === null &&
      !hasIllustration(entry.slug)
        ? [entry.slug]
        : [],
    );
    expect(gaps.toSorted()).toEqual([...NO_LIVE_SCENE.keys()].toSorted());
  });

  /**
   * The shipped bug this guards (measured 2026-10-18): `search-input.mdx` said
   * "No live scene ships for this component yet" while search-input has shipped
   * one since plan 493, and the earlier rule only looked for "cannot render it
   * live". A record's own limitations can carry the same denial into the status
   * block above the page, so both surfaces are read.
   */
  it("never tells a reader a page with a scene has none", () => {
    const denial =
      /(?:no live scene ships|cannot render (?:it|this component) live)/i;
    const denied = components.flatMap((entry) => {
      if (entry.liveScene === null) return [];
      const surfaces = [
        ...(denial.test(pageBody(entry.slug)) ? ["page"] : []),
        ...(entry.limitations.some((line) => denial.test(line))
          ? ["limitations"]
          : []),
      ];
      return surfaces.length === 0 ? [] : [`${entry.slug}: ${surfaces}`];
    });
    expect(denied).toEqual([]);
  });
});

describe("stateful records", () => {
  /**
   * The bug this guards (plan 508): six of the 21 `stateful` records had no live
   * scene, so their pages showed a rest illustration and no proof of the state
   * the page is about. A scene that is not possible yet needs a written reason,
   * and the reason list is compared with the registry in both directions.
   */
  const statefulWithoutScene = components.filter(
    (entry) => entry.pattern === "stateful" && entry.liveScene === null,
  );

  it("give every stateful record a live scene or a measured reason", () => {
    const missing = statefulWithoutScene.map((entry) => entry.slug);
    expect(missing.toSorted()).toEqual(
      [...STATEFUL_NO_LIVE_SCENE.keys()].toSorted(),
    );
  });

  it("write a reason for every stateful exception", () => {
    const empty = [...STATEFUL_NO_LIVE_SCENE].flatMap(([slug, reason]) =>
      reason.trim().length === 0 ? [slug] : [],
    );
    expect(empty).toEqual([]);
  });
});

describe("scene theme", () => {
  /**
   * The bug this guards (measured 2026-10-18): a scene using
   * `@gpuixui/components` painted its light fallback inside a dark docs page,
   * because primitives and components read two different theme contexts. The
   * surface therefore needs **both** providers, and both must receive the
   * resolved theme, or a dark page shows light Tabs and Popovers again.
   */
  it("puts the surface inside both theme providers with the same theme", () => {
    const tokens = mainSource.indexOf("<TokensThemeProvider theme={theme}>");
    const primitives = mainSource.indexOf("<ThemeProvider theme={theme}>");
    const surface = mainSource.indexOf("<LiveSurface");
    expect(tokens).toBeGreaterThanOrEqual(0);
    expect(primitives).toBeGreaterThanOrEqual(0);
    expect(tokens).toBeLessThan(surface);
    expect(primitives).toBeLessThan(surface);
    expect(mainSource.indexOf("</TokensThemeProvider>")).toBeGreaterThan(
      surface,
    );
    expect(mainSource.indexOf("</ThemeProvider>")).toBeGreaterThan(surface);
  });
});
