/**
 * Holds the `notification-centre-lifecycle` fixture, the probe that paints it,
 * and the numbers the README teaches.
 *
 * The bug this guards: Tier 5's *Notification centre* row was `?` — "composition
 * over toasts + panels" — and nothing had measured which half could store the
 * history. The shipped toast store keeps three cards and expires the oldest, so
 * a centre panel must own its list while the viewport paints the live stack.
 * These cases keep that rule, the stack arithmetic and the prose pointing at the
 * same numbers.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_CHECKS,
  NOTIFICATION_GAP,
  NOTIFICATION_IDS,
  NOTIFICATION_MAX,
  notificationActions,
  notificationCardId,
  notificationIds,
  notificationNextId,
  notificationReadout,
  stackGeometry,
  stackedInOrder,
} from "./notification-centre.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./notification-centre-probe.tsx");
const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");
const store = read("../../../../packages/components/src/toast/store.ts");

/** One card's painted box, oldest first in a stack. */
const box = (y: number) => ({ x: 1044, y, width: 356, height: 54 });

describe("the store's bound", () => {
  it("keeps the number the shipped store declares", () => {
    // The probe's negative control measured a four-card expectation failing
    // against the window's three, so this constant is the store's, not the
    // probe's convenience.
    expect(store).toContain("const DEFAULT_MAX = 3;");
    expect(NOTIFICATION_MAX).toBe(3);
  });

  it("expires the oldest card when the queue overflows", () => {
    expect(notificationIds(0)).toEqual([]);
    expect(notificationIds(1)).toEqual(["1"]);
    expect(notificationIds(3)).toEqual(["1", "2", "3"]);
    expect(notificationIds(4)).toEqual(["2", "3", "4"]);
    expect(notificationIds(5)).toEqual(["3", "4", "5"]);
  });

  it("gives the next push the id after the newest live one", () => {
    expect(notificationNextId([])).toBe("1");
    expect(notificationNextId(["1", "2"])).toBe("3");
    expect(notificationNextId(["9"])).toBe("10");
  });
});

describe("the readouts", () => {
  it("spells the queue and the action count", () => {
    expect(notificationReadout([])).toBe("queued=0 ids=none");
    expect(notificationReadout(["2", "3", "4"])).toBe("queued=3 ids=2,3,4");
    expect(notificationActions(0)).toBe("actions=0");
    expect(notificationActions(1)).toBe("actions=1");
  });

  it("names each card after its toast id", () => {
    expect(notificationCardId("2")).toBe("toast-2");
    expect(NOTIFICATION_IDS.push(0)).toBe("notification-push-1");
    expect(NOTIFICATION_IDS.clear).toBe("notification-clear");
  });
});

describe("the stack geometry", () => {
  it("reads a viewport column from the three cards", () => {
    const boxes = [box(100), box(166), box(232)];
    expect(stackGeometry(boxes)).toEqual({
      widths: [356, 356, 356],
      rights: [1400, 1400, 1400],
      gaps: [NOTIFICATION_GAP, NOTIFICATION_GAP],
    });
    expect(stackedInOrder(boxes)).toBe(true);
  });

  it("refuses an overlap, a drift, a collapsed stack and a lone card", () => {
    // Overlapping cards hide a message behind another one.
    expect(stackedInOrder([box(100), box(120), box(140)])).toBe(false);
    // A right edge that drifts makes the stack read as two columns.
    expect(
      stackedInOrder([
        box(100),
        { ...box(166), x: 1032 },
        { ...box(232), x: 1020 },
      ]),
    ).toBe(false);
    // Two cards on one origin are not a stack.
    expect(stackedInOrder([box(100), box(100)])).toBe(false);
    // One card cannot prove a gap.
    expect(stackedInOrder([box(100)])).toBe(false);
  });

  it("treats one point of drift as the same edge", () => {
    expect(
      stackedInOrder([box(100), box(166), { ...box(232), width: 357 }]),
    ).toBe(true);
  });
});

describe("the probe and the registry", () => {
  it("registers the probe as an overlay measurement", () => {
    expect(liveRegistry).toContainEqual({
      id: "notification-centre-lifecycle",
      title:
        "Overlay: the toast store keeps three cards and expires the oldest, so a centre panel owns the history while the viewport paints the live stack",
      capability: "overlay",
    });
  });

  it("drives both halves through the shipped components", () => {
    // A probe that painted its own cards would leave the shipped stack
    // unmeasured, so the composition is the claim.
    expect(probe).toContain("useToast()");
    expect(probe).toContain("<ToastViewport />");
    expect(probe).toContain("defaultDuration={Duration.minutes(5)}");
    expect(probe).toContain("toast.dismissAll()");
    expect(probe).toContain("notificationReadout(live)");
    expect(probe).toContain("stackedInOrder(");
    expect(probe).toContain("stackGeometry(");
    expect(probe).toContain("NOTIFICATION_GAP");
  });

  it("mounts the probe in the live scenario table", () => {
    expect(scenarios).toContain('"notification-centre-lifecycle": {');
    expect(scenarios).toContain("steps: notificationCentreSteps");
    expect(scenarios).toContain("<NotificationCentreProbe />");
  });

  it("counts the checks the probe can assert", () => {
    // The printed count is the run's own, so it cannot be derived statically;
    // the assertion sites are the floor a hollow probe cannot fall below.
    const steps = probe.slice(
      probe.indexOf("export const notificationCentreSteps"),
    );
    const sites = Arr.length(
      Arr.fromIterable(steps.matchAll(/ctx\.expect\w+\(/g)),
    );
    expect(sites).toBeGreaterThan(0);
    expect(NOTIFICATION_CHECKS).toBeGreaterThanOrEqual(sites);
  });
});

describe("the README", () => {
  it("documents the measurement under the version it was made on", () => {
    expect(readme).toContain(
      "### `notification-centre-lifecycle` — measured on 0.11.0 here",
    );
    expect(readme).toContain(`${NOTIFICATION_CHECKS} checks`);
    expect(readme).toContain("`src/live/notification-centre.ts`");
    expect(readme).toContain("notification-centre.test.ts");
  });

  it("prints the queue the window measured, not the fixture's wish", () => {
    const flat = readme.replace(/\s+/g, " ");
    expect(flat).toContain(
      "| push a fourth | `queued=3 ids=2,3,4`; card 1 unpaints",
    );
    expect(flat).toContain(notificationReadout(notificationIds(3)));
    expect(flat).toContain(`queued=4 ids=1,2,3,4`);
    expect(flat).toContain(
      `expected "queued=4 ids=1,2,3,4", got "queued=3 ids=2,3,4"`,
    );
    expect(flat).toContain(`${NOTIFICATION_GAP}px apart`);
  });

  it("states which half owns the history", () => {
    const flat = readme.replace(/\s+/g, " ");
    expect(flat).toContain("expires the oldest");
    expect(flat).toContain("the **centre still lists it**");
    expect(flat).toContain("the app's clear");
    expect(flat).toContain("in-window only");
  });

  it("names the evidence captures and the honest limit", () => {
    const flat = readme.replace(/\s+/g, " ");
    expect(
      Arr.filter(
        [
          "notification-stack",
          "notification-expired",
          "notification-transient",
        ],
        (state) => !flat.includes(`.artifacts/live/${state}.png`),
      ),
    ).toEqual([]);
    expect(flat).toContain("no notification method");
    expect(flat).toContain("`toast-dismiss`");
  });
});
