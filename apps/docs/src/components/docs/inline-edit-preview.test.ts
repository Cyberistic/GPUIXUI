import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  beginEdit,
  cancelEdit,
  commitEdit,
  editDraft,
  nameLimit,
  nameVerdict,
  renameOf,
  type Rename,
} from "./inline-edit-preview";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const source = read("../../../../../packages/components/src/inline-edit.tsx");

const atRest = (): Rename => renameOf("Docs site");

const editing = (draft: string): Rename =>
  editDraft(beginEdit(atRest()), draft);

describe("the inline edit preview", () => {
  it("stops an edit from being committed twice, because Enter arrives twice", () => {
    const first = commitEdit(editing("Docs"));

    expect(first.commits).toBe(1);
    expect(first.value).toBe("Docs");

    const second = commitEdit(first);

    expect(second).toBe(first);
    expect(second.commits).toBe(1);
  });

  it("calls nothing for an unchanged draft, and still finishes the edit", () => {
    const unchanged = commitEdit(beginEdit(atRest()));

    expect(unchanged.commits).toBe(0);
    expect(unchanged.editing).toBe(false);
    expect(unchanged.value).toBe("Docs site");
    expect(unchanged.focus).toBe("display");
  });

  it("leaves the focus where the reader put it when a blur commits", () => {
    const blurred = commitEdit(editing("Docs"), "blur");

    expect(blurred.focus).toBe("elsewhere");
    expect(blurred.value).toBe("Docs");
    expect(blurred.commits).toBe(1);
  });

  it("returns the focus to the display after the keyboard", () => {
    const entered = commitEdit(editing("Docs"), "enter");

    expect(entered.focus).toBe("display");
    expect(beginEdit(atRest()).focus).toBe("input");
  });

  it("discards the draft on Escape, and Escape alone", () => {
    const discarded = cancelEdit(editing("Docs"));

    expect(discarded.value).toBe("Docs site");
    expect(discarded.draft).toBe("Docs site");
    expect(discarded.discards).toBe(1);
    expect(discarded.commits).toBe(0);
    expect(discarded.focus).toBe("display");

    expect(cancelEdit(discarded)).toBe(discarded);
  });

  it("starts the next edit from the committed value, never the abandoned draft", () => {
    const abandoned = cancelEdit(editing("Draft nobody kept"));
    const restarted = beginEdit(abandoned);

    expect(restarted.draft).toBe("Docs site");
    expect(restarted.value).toBe("Docs site");
  });

  it("keeps the caller's value while the draft changes", () => {
    const typed = editing("A new name");

    expect(typed.value).toBe("Docs site");
    expect(typed.draft).toBe("A new name");
    expect(typed.commits).toBe(0);
  });

  it("accepts an empty name, and the app refuses it", () => {
    const emptied = commitEdit(editing(""));

    expect(emptied.value).toBe("");
    expect(emptied.commits).toBe(1);
    expect(nameVerdict(emptied.value)).toEqual({
      ok: false,
      message: "A workspace needs a name.",
    });
  });

  it("refuses a name nobody can read, at the limit it prints", () => {
    expect(nameVerdict("fits")).toEqual({ ok: true });
    expect(nameVerdict("x".repeat(nameLimit))).toEqual({ ok: true });

    const long = nameVerdict("x".repeat(nameLimit + 1));

    expect(long.ok).toBe(false);
    expect(long.message).toContain(`${nameLimit} characters`);
    expect(long.message).toContain(`${nameLimit + 1}`);
    expect(nameVerdict("   ").ok).toBe(false);
  });

  it("reads the contract the component actually implements", () => {
    expect(source).toContain("const finished = useRef(false);");
    expect(source).toContain("if (finished.current) return;");
    expect(source).toContain(
      "if (commit && !disabled && draft !== value) onCommit(draft);",
    );
    expect(source).toContain("const commit = (): void => finish(true, true);");
    expect(source).toContain("const cancel = (): void => finish(false, true);");
    expect(source).toContain("setDraft(value);");
    expect(source).toContain("renderer?.focusElement?.(inputId);");
  });

  it("discards a draft the caller disabled before any finish arrives", () => {
    expect(source).toContain("if (commit && !disabled && draft !== value)");
  });

  it("keeps the caller's handlers after its own on the editor", () => {
    const compact = source.replace(/\s+/g, " ");

    expect(compact).toContain(
      'onChange={(event) => { setDraft(event.value ?? ""); onChange?.(event); }}',
    );
    expect(compact).toContain(
      "onSubmit={(event) => { commit(); onSubmitProp?.(event); }}",
    );
    expect(compact).toContain(
      "onBlur={(event) => { finish(true, false); onBlur?.(event); }}",
    );
  });

  it("keeps the display and the editor the page prints", () => {
    expect(source).toContain('minHeight: controlHeight(theme, "sm")');
    expect(source).toContain('height: controlHeight(theme, "md")');
    expect(source).toContain("hover: { backgroundColor: theme.colors.accent }");
    expect(source).toContain('role="button"');
    expect(source).toContain("tabIndex={disabled ? -1 : 0}");
    expect(source).toContain('placeholder = "—"');
    expect(source).toContain("editing: editingProp,");
    expect(source).toContain("defaultEditing = false,");
  });
});
