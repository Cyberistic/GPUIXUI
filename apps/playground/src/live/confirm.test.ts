import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CONFIRM_ACCEPT,
  CONFIRM_CANCEL,
  CONFIRM_OPENER,
  CONFIRM_READOUT,
  confirmFlow,
  confirmReadout,
  initialConfirmFlow,
  type ConfirmEvent,
  type ConfirmFlow,
} from "./confirm.js";

const shipped = readFileSync(
  new URL(
    "../../../../packages/components/src/confirm-dialog.tsx",
    import.meta.url,
  ),
  "utf8",
);

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

const confirmSteps = (() => {
  const start = scenarios.indexOf("const confirmSteps");
  const end = scenarios.indexOf("\nconst ", start + 1);
  return start === -1 || end === -1 ? "" : scenarios.slice(start, end);
})();

const printedCheckCount = (): number =>
  Number(
    /(\d+) checks, `--only confirm-dialog-lifecycle`/.exec(readme)?.[1] ??
      Number.NaN,
  );

const replay = (events: ReadonlyArray<ConfirmEvent>): ConfirmFlow =>
  events.reduce(confirmFlow, initialConfirmFlow);

describe("the confirmation flow the probe records", () => {
  it("a confirm reports once and the caller closes the surface", () => {
    expect(replay(["open", "confirm"])).toEqual({
      open: false,
      opens: 1,
      confirms: 1,
      closes: 1,
    });
  });

  it("a cancel closes without reporting a confirm", () => {
    expect(confirmReadout(replay(["open", "cancel"]))).toBe(
      "open=false opens=1 confirms=0 closes=1",
    );
  });

  it("a second confirm is a second report, so the single-report check can fail", () => {
    expect(replay(["open", "confirm", "open", "confirm"]).confirms).toBe(2);
  });

  it("counts every open, so a reopen after a close is visible", () => {
    expect(replay(["open", "confirm", "open"])).toEqual({
      open: true,
      opens: 2,
      confirms: 1,
      closes: 1,
    });
  });

  it("names the shipped controls and the caller-owned close", () => {
    expect(shipped).toContain(`testId="${CONFIRM_CANCEL}"`);
    expect(shipped).toContain(`testId="${CONFIRM_ACCEPT}"`);

    expect(shipped).toContain(
      "initialFocus={() => cancel.current?.id ?? null}",
    );

    expect(shipped).toContain("onClick={onConfirm}");
  });

  it("addresses the fixture with ids no other probe owns", () => {
    expect([CONFIRM_OPENER, CONFIRM_READOUT]).toEqual([
      "confirm-open",
      "confirm-readout",
    ]);
  });

  it("prints the check count the probe actually asserts", () => {
    const asserted = confirmSteps.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;
    expect(asserted).toBeGreaterThan(1);
    expect(printedCheckCount()).toBe(asserted);
  });
});
