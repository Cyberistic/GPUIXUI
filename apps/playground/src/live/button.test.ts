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

    expect(by("host")).toEqual(["click"]);

    expect(by("activates")).toEqual(["click", "enter-press", "space-release"]);

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

    expect(activationKind({ eventType: "keyDown" })).toBe("none");
    expect(activationKind({ eventType: "focus" })).toBe("none");
  });

  it("prints the counters, the point and the refusals", () => {
    expect(formatCounts({ host: 1, activates: 2, last: "keyDown:enter" })).toBe(
      "host=1 activates=2 last=keyDown:enter",
    );

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

    expect(fieldOf("host=0 activates=0 last=none x=none y=none", "x")).toEqual(
      Option.none(),
    );
    expect(fieldOf(text, "z")).toEqual(Option.none());
    expect(fieldOf("x=notanumber", "x")).toEqual(Option.none());
  });

  it("holds the probe to the table it asserts against", () => {
    Arr.forEach(BUTTON_GESTURES, (gesture) => {
      expect(probe).toContain(`Match.when("${gesture}"`);
    });

    expect(probe).toContain("${route.caption} leaves ${formatCounts(route)}");
    expect(probe).toContain('formatCounts(buttonRoute("space-release"))');
    expect(probe).toContain("formatRefusals({ disabled: 0, busy: 0 })");
    expect(probe).toContain("BUTTON_TAB_ORDER");

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
