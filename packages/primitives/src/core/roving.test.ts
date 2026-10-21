/**
 * `rovingIndex` — the one tab stop a group of controls shares.
 *
 * The bug this suite guards: the stop sat on the chosen option even when that
 * option was disabled. A disabled row has no `tabIndex`, so the group had no
 * reachable stop at all and a keyboard user could not enter it.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { rovingIndex } from "./roving.js";

const noneDisabled = (): boolean => false;

describe("rovingIndex", () => {
  it("keeps the preferred index when it can take focus", () => {
    const index = rovingIndex(3, Option.some(2), noneDisabled);

    expect(index).toStrictEqual(Option.some(2));
  });

  it("falls back to the first enabled option when the preferred one is disabled", () => {
    const index = rovingIndex(
      3,
      Option.some(0),
      (candidate) => candidate === 0,
    );

    expect(index).toStrictEqual(Option.some(1));
  });

  it("reports no stop when every option is disabled", () => {
    const index = rovingIndex(2, Option.some(1), () => true);

    expect(index).toStrictEqual(Option.none());
  });

  it("ignores a preferred index the group no longer has", () => {
    const index = rovingIndex(2, Option.some(5), noneDisabled);

    expect(index).toStrictEqual(Option.some(0));
  });

  it("takes the first enabled option when the group has no preference", () => {
    const index = rovingIndex(4, Option.none(), (candidate) => candidate < 2);

    expect(index).toStrictEqual(Option.some(2));
  });

  it("reports no stop for an empty group", () => {
    expect(rovingIndex(0, Option.none(), noneDisabled)).toStrictEqual(
      Option.none(),
    );
  });
});
