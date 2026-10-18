/**
 * The editable-grid model's rules, proven without a renderer (plan `387`).
 *
 * The bug this file guards: the scenario drives one path through the grid, so
 * a rule that commits to the wrong row, keeps editing a row that left the
 * window, or deletes the last row instead of the named one would surface as a
 * confusing runtime failure. Every assertion here can fail by changing the
 * model.
 */
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import type { Anchor } from "./data-grid-model.js";
import {
  LIST_HEIGHT,
  ROW_COUNT,
  ROW_HEIGHT,
  activate,
  beginEdit,
  cancel,
  closePanel,
  commit,
  deleteRow,
  describe as describeEditor,
  editDraft,
  endEditingOutside,
  initial,
  makeRows,
  moveSelection,
  noteKey,
  openPanel,
  select,
  sorting,
} from "./grid-editor-model.js";
import { visibleIds } from "./grid-editor-model.js";

const rows = makeRows();

describe("makeRows", () => {
  it("makes 60 stable, zero-padded rows", () => {
    expect(rows).toHaveLength(ROW_COUNT);
    expect(rows[0]).toEqual({ id: 0, name: "item-00", kind: "dir", size: 0 });
    expect(rows[59]).toEqual({
      id: 59,
      name: "item-59",
      kind: "file",
      size: 236,
    });
    expect(rows.map((row) => row.name)).toEqual(
      rows.map((row) => `item-${String(row.id).padStart(2, "0")}`),
    );
  });
});

describe("visibleIds", () => {
  const at = (index: number, offset = 0): Anchor => ({ index, offset });

  it("shows exactly the viewport at the top", () => {
    expect(visibleIds(rows, at(0), LIST_HEIGHT, ROW_HEIGHT)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });

  it("counts a partly scrolled row and the one it reveals", () => {
    expect(visibleIds(rows, at(40, 16), LIST_HEIGHT, ROW_HEIGHT)).toEqual([
      40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
    ]);
  });

  it("clamps at the end of the list", () => {
    expect(visibleIds(rows, at(55), LIST_HEIGHT, ROW_HEIGHT)).toEqual([
      55, 56, 57, 58, 59,
    ]);
  });

  it("is empty when there are no rows", () => {
    expect(visibleIds([], at(0), LIST_HEIGHT, ROW_HEIGHT)).toEqual([]);
  });
});

describe("beginEdit and editDraft", () => {
  it("seeds the draft from the committed name", () => {
    const state = beginEdit(initial(rows), 3);
    expect(Option.getOrElse(state.editing, () => -1)).toBe(3);
    expect(state.draft).toBe("item-03");
    expect(state.last).toBe("edit");
  });

  it("names the opening path", () => {
    expect(beginEdit(initial(rows), 2, "rename").last).toBe("rename");
  });

  it("edits only one row at a time", () => {
    const first = beginEdit(initial(rows), 1);
    const second = beginEdit(first, 2);
    expect(Option.getOrElse(second.editing, () => -1)).toBe(2);
    expect(second.draft).toBe("item-02");
  });

  it("ignores a row that does not exist", () => {
    const state = initial(rows);
    expect(beginEdit(state, 99)).toBe(state);
  });

  it("records the draft and never touches the committed rows", () => {
    const state = editDraft(beginEdit(initial(rows), 0), "beta");
    expect(state.draft).toBe("beta");
    expect(state.last).toBe("draft");
    expect(rows[0]?.name).toBe("item-00");
  });

  it("does nothing when nothing is being edited", () => {
    const state = initial(rows);
    expect(editDraft(state, "beta")).toBe(state);
  });
});

describe("commit and cancel", () => {
  it("writes the draft to the edited row and counts the commit", () => {
    const state = commit(editDraft(beginEdit(initial(rows), 4), "beta"));
    expect(state.rows[4]?.name).toBe("beta");
    expect(state.commits).toBe(1);
    expect(Option.isNone(state.editing)).toBe(true);
    expect(state.draft).toBe("");
    expect(state.last).toBe("commit");
  });

  it("is a no-op object when nothing is being edited", () => {
    const state = initial(rows);
    expect(commit(state)).toBe(state);
  });

  it("discards the draft on cancel", () => {
    const state = cancel(editDraft(beginEdit(initial(rows), 0), "beta"));
    expect(state.rows[0]?.name).toBe("item-00");
    expect(state.commits).toBe(0);
    expect(state.draft).toBe("");
    expect(state.last).toBe("cancel");
  });
});

describe("endEditingOutside", () => {
  it("keeps an edit whose row is still visible", () => {
    const state = editDraft(beginEdit(initial(rows), 3), "beta");
    expect(endEditingOutside(state, [3, 4, 5])).toBe(state);
  });

  it("commits when the row left the window", () => {
    const state = editDraft(beginEdit(initial(rows), 3), "beta");
    const ended = endEditingOutside(state, [40, 41, 42]);
    expect(Option.isNone(ended.editing)).toBe(true);
    expect(ended.rows[3]?.name).toBe("beta");
    expect(ended.commits).toBe(1);
    expect(ended.last).toBe("leave");
  });
});

describe("selection", () => {
  it("records a click", () => {
    const state = select(initial(rows), 7);
    expect(Option.getOrElse(state.selected, () => -1)).toBe(7);
    expect(state.last).toBe("select");
  });

  it("opens the editor only on the second press of a selected row", () => {
    const first = activate(initial(rows), 4);
    expect(Option.getOrElse(first.selected, () => -1)).toBe(4);
    expect(Option.isNone(first.editing)).toBe(true);
    const second = activate(first, 4);
    expect(Option.getOrElse(second.editing, () => -1)).toBe(4);
    expect(second.last).toBe("edit");
  });

  it("moves from no selection to the first row", () => {
    const state = moveSelection(initial(rows), rows, 1);
    expect(Option.getOrElse(state.selected, () => -1)).toBe(0);
  });

  it("walks the given order and clamps at both ends", () => {
    const atEnd = moveSelection(select(initial(rows), 59), rows, 1);
    expect(Option.getOrElse(atEnd.selected, () => -1)).toBe(59);
    const atStart = moveSelection(select(initial(rows), 0), rows, -1);
    expect(Option.getOrElse(atStart.selected, () => -1)).toBe(0);
    const moved = moveSelection(select(initial(rows), 10), rows, 1);
    expect(Option.getOrElse(moved.selected, () => -1)).toBe(11);
  });
});

describe("the row menu", () => {
  it("opens for one row and records its reason", () => {
    const state = openPanel(initial(rows), 2);
    expect(Option.getOrElse(state.panel, () => -1)).toBe(2);
    expect(state.last).toBe("panel");
  });

  it("closes with the reason it was dismissed by", () => {
    const state = closePanel(openPanel(initial(rows), 2), "escape");
    expect(Option.isNone(state.panel)).toBe(true);
    expect(state.last).toBe("escape");
  });

  it("ignores a close when nothing is open", () => {
    const state = initial(rows);
    expect(closePanel(state, "outside")).toBe(state);
  });
});

describe("deleteRow", () => {
  it("removes exactly the named row", () => {
    const state = deleteRow(initial(rows), 3);
    expect(state.rows).toHaveLength(ROW_COUNT - 1);
    expect(state.rows.some((row) => row.id === 3)).toBe(false);
    expect(state.rows.some((row) => row.id === 59)).toBe(true);
    expect(state.last).toBe("delete");
  });

  it("clears an edit, selection or panel that named the row", () => {
    const state = deleteRow(
      openPanel(select(beginEdit(initial(rows), 3), 3), 3),
      3,
    );
    expect(Option.isNone(state.editing)).toBe(true);
    expect(Option.isNone(state.selected)).toBe(true);
    expect(Option.isNone(state.panel)).toBe(true);
    expect(state.draft).toBe("");
  });

  it("leaves unrelated state alone", () => {
    const state = deleteRow(select(initial(rows), 5), 3);
    expect(Option.getOrElse(state.selected, () => -1)).toBe(5);
  });

  it("is a no-op for an unknown id", () => {
    const state = initial(rows);
    expect(deleteRow(state, 99)).toBe(state);
  });
});

describe("noteKey and describe", () => {
  it("counts only keys", () => {
    const state = noteKey(noteKey(initial(rows)));
    expect(state.keys).toBe(2);
    expect(state.rows).toBe(rows);
  });

  it("commits the draft and closes the menu on a sort", () => {
    const state = sorting(
      openPanel(editDraft(beginEdit(initial(rows), 2), "beta"), 2),
    );
    expect(state.rows[2]?.name).toBe("beta");
    expect(state.commits).toBe(1);
    expect(Option.isNone(state.editing)).toBe(true);
    expect(Option.isNone(state.panel)).toBe(true);
    expect(state.last).toBe("sort");
  });

  it("sorts an idle grid without inventing a commit", () => {
    const state = sorting(initial(rows));
    expect(state.commits).toBe(0);
    expect(state.last).toBe("sort");
  });

  it("prints the baseline exactly as the scenario asserts it", () => {
    expect(describeEditor(initial(rows))).toBe(
      "editing=none draft=- commits=0 rows=60 sel=none panel=none keys=0 last=start",
    );
  });

  it("prints the live editing fields", () => {
    expect(
      describeEditor(
        noteKey(openPanel(editDraft(beginEdit(initial(rows), 6), "beta"), 6)),
      ),
    ).toBe(
      "editing=6 draft=beta commits=0 rows=60 sel=none panel=6 keys=1 last=panel",
    );
  });

  it("does not mutate the input state", () => {
    const state = initial(rows);
    beginEdit(state, 1);
    commit(beginEdit(state, 1));
    expect(describeEditor(state)).toBe(describeEditor(initial(rows)));
  });
});
