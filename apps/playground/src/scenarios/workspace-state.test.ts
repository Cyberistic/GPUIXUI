/**
 * Guards the workspace persistence boundary.
 *
 * The bug these catch: a snapshot that drops the runtime anchor (so a restored
 * workspace scrolls to the top), a description that renders an empty pane as an
 * empty string (so a scenario cannot tell "no tabs" from a missing value), and
 * a JSON round trip that loses a field or accepts a malformed save.
 */
import { describe, expect, it } from "@effect/vitest";
import * as Option from "effect/Option";
import {
  DEFAULT_WORKSPACE,
  decodeWorkspace,
  describeWorkspace,
  encodeWorkspace,
  snapshotWorkspace,
  WorkspaceState,
} from "./workspace-state.js";

const changed = new WorkspaceState({
  split: 400,
  tabsA: ["two"],
  tabsB: ["one"],
  active: "one",
  anchorIndex: 0,
  anchorOffset: 0,
});

describe("describeWorkspace", () => {
  it("encodes the pane layout and prints an empty pane as none", () => {
    expect(describeWorkspace(DEFAULT_WORKSPACE)).toBe(
      "split=320 tabsA=one,two tabsB=none active=one",
    );
    expect(describeWorkspace(changed)).toBe(
      "split=400 tabsA=two tabsB=one active=one",
    );
  });
});

describe("snapshotWorkspace", () => {
  it("takes the anchor from the runtime and every other field from the state", () => {
    const snapshot = snapshotWorkspace(changed, [120, 16, 280]);
    expect(snapshot.split).toBe(400);
    expect(snapshot.tabsA).toEqual(["two"]);
    expect(snapshot.tabsB).toEqual(["one"]);
    expect(snapshot.active).toBe("one");
    expect(snapshot.anchorIndex).toBe(120);
    expect(snapshot.anchorOffset).toBe(16);
  });
});

describe("workspace JSON", () => {
  it("round-trips every field", () => {
    const decoded = decodeWorkspace(
      encodeWorkspace(snapshotWorkspace(changed, [120, 16, 280])),
    );
    expect(
      Option.match(decoded, {
        onNone: () => "none",
        onSome: (state) =>
          state instanceof WorkspaceState
            ? `${state.split}/${state.anchorIndex}/${state.anchorOffset}`
            : "not a WorkspaceState",
      }),
    ).toBe("400/120/16");
  });

  it("rejects a malformed or wrong-shaped save", () => {
    expect(Option.isNone(decodeWorkspace("not json"))).toBe(true);
    expect(Option.isNone(decodeWorkspace('{"split":"wide"}'))).toBe(true);
  });
});
