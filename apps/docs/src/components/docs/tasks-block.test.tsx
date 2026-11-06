import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  addInboxTask,
  initialDocs,
  initialTasks,
  openTasksOf,
  setPinned,
  splitPinned,
  TasksRender,
  toggleTask,
  type Task,
} from "./tasks-block";

const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const css = read("../../styles/blocks.css");
const markup = renderToStaticMarkup(<TasksRender />);

describe("the tasks block", () => {
  it("counts a document's open tasks from the task array", () => {
    const doc = initialDocs.find((entry) => entry.id === "exam-prep");
    expect(doc).toBeDefined();
    const before = openTasksOf(initialTasks, "exam-prep").length;

    expect(before).toBeGreaterThan(0);

    const open = initialTasks.filter(
      (task) => Option.contains(task.doc, "exam-prep") && !task.done,
    );
    expect(open).toHaveLength(before);
  });

  it("takes a task out of the open count when it is ticked", () => {
    const open = openTasksOf(initialTasks, "exam-prep");
    const first = open[0];
    expect(first).toBeDefined();
    if (first === undefined) return;

    const ticked = toggleTask(initialTasks, first.id);

    expect(openTasksOf(ticked, "exam-prep")).toHaveLength(open.length - 1);

    expect(ticked).toHaveLength(initialTasks.length);
    expect(openTasksOf(toggleTask(ticked, first.id), "exam-prep")).toHaveLength(
      open.length,
    );
  });

  it("appends a new inbox task with a fresh id each press", () => {
    const once = addInboxTask(initialTasks);
    const twice = addInboxTask(once);

    expect(once).toHaveLength(initialTasks.length + 1);
    expect(twice).toHaveLength(initialTasks.length + 2);

    const added = twice.slice(initialTasks.length);
    const ids = added.map((task: Task) => task.id);
    expect(new Set(ids).size).toBe(2);

    expect(added.every((task: Task) => Option.isNone(task.doc))).toBe(true);
  });

  it("moves a document between the two card rows when it is pinned", () => {
    const before = splitPinned(initialDocs);
    const unpinned = before.rest[0];
    expect(unpinned).toBeDefined();
    if (unpinned === undefined) return;

    const after = splitPinned(setPinned(initialDocs, unpinned.id, true));

    expect(after.pinned).toHaveLength(before.pinned.length + 1);
    expect(after.rest).toHaveLength(before.rest.length - 1);
    expect(after.pinned.some((doc) => doc.id === unpinned.id)).toBe(true);
    expect(after.rest.some((doc) => doc.id === unpinned.id)).toBe(false);

    const back = splitPinned(setPinned(initialDocs, unpinned.id, true));
    const restored = splitPinned(
      setPinned(setPinned(initialDocs, unpinned.id, true), unpinned.id, false),
    );
    expect(restored.rest).toHaveLength(before.rest.length);
    expect(back.pinned).toHaveLength(before.pinned.length + 1);
  });

  it("draws the reference's regions", () => {
    expect(markup).toContain('class="gx-task-bar"');
    expect(markup).toContain('class="gx-task-side"');
    expect(markup).toContain("Whale Island");
    expect(markup).toContain("New Task");
    expect(markup).toContain("Inbox");
    expect(markup).toContain("Pinned Docs");
    expect(markup).toContain("Docs With Tasks");
  });

  it("opens the views in the shared reorderable tabs", () => {
    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('aria-label="Open views"');
    expect(markup).toContain('data-reorder-tab="tasks"');
    expect(markup).toContain('aria-label="Close Tasks"');
    expect(css).toContain(".gx-task-tabs");
    expect(css).toContain(".gx-task-tab");
  });

  it("gives every card the count and the tasks it holds", () => {
    expect(markup).toContain("tasks to do");

    const exam = openTasksOf(initialTasks, "exam-prep")[0];
    expect(exam).toBeDefined();
    if (exam !== undefined) expect(markup).toContain(exam.title);
  });

  it("writes one task in the singular", () => {
    expect(markup).toContain("1 task to do");
    expect(markup).not.toContain("1 tasks to do");
  });

  it("gives each section a collapse control", () => {
    expect(css).toContain('[aria-expanded="false"]');
    expect(markup).toContain("Collapse Inbox");
    expect(markup).toContain("Collapse Pinned Docs");
  });

  it("keeps the rail's icons when it collapses", () => {
    expect(css).toContain('.gx-task-side[data-collapsed="true"]');
    expect(css).toContain(
      '.gx-task-side[data-collapsed="true"] .gx-task-nav-label',
    );
  });
});
