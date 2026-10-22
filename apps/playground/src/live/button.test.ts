/**
 * Guards the fixture `button-activation-lifecycle` measures the shipped
 * `Button` with.
 *
 * The probe compares each gesture's readout against `BUTTON_ROUTES`; a table
 * that credited a Space press with an activation, a gesture the probe never
 * sends, or a README that stopped printing the measured route would all leave
 * the probe green against a fixture that no longer describes a button. The rule
 * the probe teaches is `core/keyboard.ts`'s — Enter activates on the press,
 * Space on the release, a held key ignores both — and the window half is the
 * delivery path: the automation sends a key down with no release, so only a
 * probe that releases proves the Space half at all.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  BUTTON_GESTURES,
  BUTTON_ROUTES,
  BUTTON_TAB_ORDER,
  activationKind,
  buttonRoute,
  fieldOf,
  formatActivation,
  formatCounts,
  formatRefusals,
  type ButtonGesture,
} from "./button.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);
const probe = readFileSync(new URL("./scenarios.tsx", import.meta.url), "utf8");

/** The `button-activation-lifecycle` section, without the headings after it. */
const section = (): string => {
  const start = readme.indexOf("### `button-activation-lifecycle`");
  const end = readme.indexOf("\n### ", start + 1);
  return start === -1 ? "" : readme.slice(start, end === -1 ? undefined : end);
};

describe("the button-activation fixture", () => {
  it("carries one route per gesture, in the order the probe sends them", () => {
    expect(Arr.map(BUTTON_ROUTES, (route) => route.gesture)).toEqual([
      ...BUTTON_GESTURES,
    ]);
    expect(Arr.map(BUTTON_GESTURES, buttonRoute)).toEqual(BUTTON_ROUTES);
    expect(Arr.map(BUTTON_ROUTES, (route) => route.caption)).toEqual(
      Arr.dedupe(Arr.map(BUTTON_ROUTES, (route) => route.caption)),
    );
  });

  it("credits each activation to the gesture that carries it", () => {
    /** The counts each gesture adds, read off the cumulative table. */
    const deltas = Arr.map(BUTTON_ROUTES, (route, index) => {
      const before = Option.getOrElse(
        Arr.get(BUTTON_ROUTES, index - 1),
        () => ({ host: 0, activates: 0 }),
      );
      return {
        gesture: route.gesture,
        host: route.host - before.host,
        activates: route.activates - before.activates,
      };
    });
    const by = (key: "host" | "activates"): ReadonlyArray<ButtonGesture> =>
      Arr.map(
        Arr.filter(deltas, (delta) => delta[key] > 0),
        (delta) => delta.gesture,
      );

    // The host `onClick` is the pointer's, and only the pointer's.
    expect(by("host")).toEqual(["click"]);
    // An activation lands on the click, Enter's press and Space's release —
    // never on Enter's release or on Space's press, the halves the platform
    // holds back.
    expect(by("activates")).toEqual(["click", "enter-press", "space-release"]);

    // A release that activates nothing leaves the counters and the kind alone.
    expect(buttonRoute("enter-release")).toMatchObject({
      host: buttonRoute("enter-press").host,
      activates: buttonRoute("enter-press").activates,
      last: buttonRoute("enter-press").last,
    });
    expect(buttonRoute("space-press")).toMatchObject({
      host: buttonRoute("enter-release").host,
      activates: buttonRoute("enter-release").activates,
      last: buttonRoute("enter-release").last,
    });
  });

  it("names the half and the key an activation came from", () => {
    expect(activationKind({ eventType: "click" })).toBe("click");
    expect(activationKind({ eventType: "keyDown", key: "enter" })).toBe(
      "keyDown:enter",
    );
    expect(activationKind({ eventType: "keyUp", key: "space" })).toBe(
      "keyUp:space",
    );
    // A key event the runtime did not name is not an activation it can report,
    // and neither is any other event: the readout says `none` rather than a half.
    expect(activationKind({ eventType: "keyDown" })).toBe("none");
    expect(activationKind({ eventType: "focus" })).toBe("none");
  });

  it("prints the counters, the point and the refusals", () => {
    expect(formatCounts({ host: 1, activates: 2, last: "keyDown:enter" })).toBe(
      "host=1 activates=2 last=keyDown:enter",
    );
    // A pointer activation carries the press point, rounded to whole pixels; a
    // key activation carries none, and the readout says so rather than `0`.
    expect(
      formatActivation(
        { host: 1, activates: 1, last: "click" },
        Option.some({ x: 411.6, y: 268.2 }),
      ),
    ).toBe("host=1 activates=1 last=click x=412 y=268");
    expect(formatActivation({ host: 0, activates: 0, last: "none" })).toBe(
      "host=0 activates=0 last=none x=none y=none",
    );
    expect(formatRefusals({ disabled: 0, busy: 0 })).toBe("disabled=0 busy=0");
  });

  it("reads a field back out of a readout, and refuses its absence", () => {
    const text = "host=1 activates=1 last=click x=412 y=268";
    expect(fieldOf(text, "x")).toEqual(Option.some(412));
    expect(fieldOf(text, "y")).toEqual(Option.some(268));
    expect(fieldOf(text, "activates")).toEqual(Option.some(1));
    // The word `none` is absent, not zero: a probe must not compare a cleared
    // readout with a real coordinate.
    expect(fieldOf("host=0 activates=0 last=none x=none y=none", "x")).toEqual(
      Option.none(),
    );
    expect(fieldOf(text, "z")).toEqual(Option.none());
    expect(fieldOf("x=notanumber", "x")).toEqual(Option.none());
  });

  it("holds the probe to the table it asserts against", () => {
    // Every route is sent by `sendGesture`, so a gesture added to the table
    // cannot be one the window never receives.
    Arr.forEach(BUTTON_GESTURES, (gesture) => {
      expect(probe).toContain(`Match.when("${gesture}"`);
    });
    // The readout a row must leave is built from the row, not typed into the
    // probe: a hardcoded expectation would survive an edit to the table.
    expect(probe).toContain("${route.caption} leaves ${formatCounts(route)}");
    expect(probe).toContain('formatCounts(buttonRoute("space-release"))');
    expect(probe).toContain("formatRefusals({ disabled: 0, busy: 0 })");
    expect(probe).toContain("BUTTON_TAB_ORDER");
    // The tab order is the stops a traversal reaches, and the disabled button is
    // not one of them: it is reachable from code only.
    expect(BUTTON_TAB_ORDER).not.toContain("button-disabled");
  });

  it("prints every measured gesture in its section", () => {
    const text = section().replace(/\s+/g, " ");
    expect(text).not.toBe("");
    Arr.forEach(BUTTON_ROUTES, (route) => {
      expect(text).toContain(formatCounts(route));
      expect(text).toContain(route.caption);
    });
  });
});
