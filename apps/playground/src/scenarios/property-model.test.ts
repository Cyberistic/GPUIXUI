/**
 * Guards the inspector's state rules.
 *
 * The probe's runtime checks cannot catch a commit that forgets to clear its
 * draft, a reset that keeps an edited value, or a filter that matches values as
 * well as labels — the scenario asserts only the paths it drives. These tests
 * pin the rules a property panel depends on.
 */
import { describe, expect, it } from "@effect/vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import {
  barWidth,
  commit,
  committedValue,
  describeInspector,
  draftValue,
  filterProperties,
  initial,
  percentOf,
  reset,
  revert,
  setDraft,
  type InspectorState,
} from "./property-model.js";

const ROWS = 96;

describe("initial", () => {
  it("builds the labelled baseline with unique ids", () => {
    const state = initial(ROWS);
    expect(Arr.length(state.properties)).toBe(ROWS);
    expect(committedValue(state, "p-0")).toBe("Untitled");
    expect(committedValue(state, "p-1")).toBe("80");
    expect(Arr.get(state.properties, 8)).toEqual(
      Option.some({ id: "p-8", label: "Property 8", value: "value 8" }),
    );
    expect(
      Arr.length(Arr.dedupe(Arr.map(state.properties, (row) => row.id))),
    ).toBe(ROWS);
  });
});

describe("drafts", () => {
  it("reads the draft over the committed value and is immutable", () => {
    const state = initial(ROWS);
    const edited = setDraft(state, "p-0", "typed");

    expect(draftValue(edited, "p-0")).toBe("typed");
    expect(committedValue(edited, "p-0")).toBe("Untitled");
    expect(draftValue(state, "p-0")).toBe("Untitled");
    expect(draftValue(state, "missing")).toBe("");
  });

  it("reverts a draft without touching the committed value", () => {
    const edited = setDraft(initial(ROWS), "p-0", "typed");
    const reverted = revert(edited, "p-0");

    expect(draftValue(reverted, "p-0")).toBe("Untitled");
    expect(revert(reverted, "p-0")).toBe(reverted);
  });
});

describe("commit", () => {
  it("moves the draft into the row and clears it", () => {
    const edited = setDraft(initial(ROWS), "p-0", "renamed");
    const result = commit(edited, "p-0");

    expect(result.committed).toBe(true);
    expect(committedValue(result.state, "p-0")).toBe("renamed");
    expect(draftValue(result.state, "p-0")).toBe("renamed");
    expect(Arr.length(R.keys(result.state.drafts))).toBe(0);
    expect(result.state.commits).toBe(1);
  });

  it("commits nothing for an untouched or unknown row", () => {
    const state = initial(ROWS);
    expect(commit(state, "p-0")).toEqual({ state, committed: false });
    expect(commit(setDraft(state, "p-0", "x"), "p-404")).toEqual({
      state: setDraft(state, "p-0", "x"),
      committed: false,
    });
  });
});

describe("reset", () => {
  it("restores the baseline and clears every draft", () => {
    const edited = setDraft(
      commit(setDraft(initial(ROWS), "p-0", "renamed"), "p-0").state,
      "p-1",
      "40",
    );
    const baseline = reset(edited);

    expect(committedValue(baseline, "p-0")).toBe("Untitled");
    expect(draftValue(baseline, "p-1")).toBe("80");
    expect(Arr.length(R.keys(baseline.drafts))).toBe(0);
    expect(baseline.commits).toBe(1);
    expect(reset(baseline)).toEqual(baseline);
  });
});

describe("filterProperties", () => {
  it("matches labels case-insensitively and preserves declaration order", () => {
    const rows = initial(ROWS).properties;
    expect(
      Arr.map(filterProperties(rows, "  ROLE  "), (row) => row.label),
    ).toEqual(["Role"]);
    expect(Arr.map(filterProperties(rows, "n"), (row) => row.label)).toEqual([
      "Name",
      "Owner",
      "Notes",
    ]);
    expect(Arr.length(filterProperties(rows, "   "))).toBe(ROWS);
    expect(filterProperties(rows, "Untitled")).toEqual([]);
  });
});

describe("the preview percentage", () => {
  it("parses, clamps and rejects a non-numeric value", () => {
    expect(percentOf("40")).toBe(40);
    expect(percentOf("140")).toBe(100);
    expect(percentOf("-5")).toBe(0);
    expect(percentOf("abc")).toBe(0);
    expect(barWidth("40")).toBe(48);
    expect(barWidth("140")).toBe(120);
    expect(barWidth("abc")).toBe(0);
  });
});

describe("describeInspector", () => {
  it("names the committed value, the draft count and the filter", () => {
    const state: InspectorState = setDraft(initial(ROWS), "p-0", "typed");
    expect(describeInspector(state, "")).toBe(
      "name=Untitled drafts=1 filter=- commits=0",
    );
    expect(describeInspector(state, "ro")).toBe(
      "name=Untitled drafts=1 filter=ro commits=0",
    );
  });
});
