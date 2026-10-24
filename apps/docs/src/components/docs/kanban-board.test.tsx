import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  KanbanRender,
  addCard,
  countCards,
  initialKanbanCards,
  kanbanColumns,
  moveCard,
  moveCardTo,
} from "./kanban-board";

/**
 * The kanban board block.
 *
 * The preview is an illustration, but the parts a reader is told to look for
 * have to reach the markup: the four counted columns, the sidebar nav and its
 * badge, the project tabs and the card's menu affordance. The pure helpers are
 * the board's rules — a moved card changes its own column only, and the heading
 * counts follow the same array — so a move cannot leave a count stale.
 */

const markup = renderToStaticMarkup(<KanbanRender />);

describe("dragging a card", () => {
  it("paints each card as a drag source and each column as a drop target", () => {
    expect(markup).toContain('draggable="true"');
    expect(markup).toContain('data-card-id="design-system"');
  });

  it("lands the card at the index the drop names", () => {
    const moved = moveCardTo(initialKanbanCards, "design-system", "done", 0);
    const done = moved.filter((card) => card.column === "done");

    expect(done[0]?.id).toBe("design-system");
    // Every other card keeps its column and its fields.
    expect(moved.filter((card) => card.column === "todo").length).toBe(
      initialKanbanCards.filter((card) => card.column === "todo").length - 1,
    );
  });

  it("reorders inside one column", () => {
    const progress = initialKanbanCards.filter(
      (card) => card.column === "progress",
    );
    const last = progress[progress.length - 1];
    // A last card moved to the front is the first thing the column paints.
    const moved = moveCardTo(initialKanbanCards, last?.id ?? "", "progress", 0);

    expect(moved.filter((card) => card.column === "progress")[0]?.id).toBe(
      last?.id,
    );
  });

  it("appends past the end of the column", () => {
    const moved = moveCardTo(initialKanbanCards, "design-system", "review", 99);

    expect(moved.filter((card) => card.column === "review").at(-1)?.id).toBe(
      "design-system",
    );
  });

  it("ignores an id the list no longer holds", () => {
    expect(moveCardTo(initialKanbanCards, "removed", "done", 0)).toBe(
      initialKanbanCards,
    );
  });
});

describe("kanban board block markup", () => {
  it("prints the app sidebar, its groups and the user row", () => {
    expect(markup).toContain("Hologram");
    for (const label of [
      "My Time",
      "My Work",
      "Boards",
      "Notification",
      "DailyArt App",
      "Wezslo.com",
      "Starlight Team",
      "Help Center",
      "⌘F",
      "dom@hologram.co",
    ]) {
      expect(markup).toContain(label);
    }
    expect(markup).toContain('aria-current="page"');
  });

  it("collapses the app sidebar to an icon strip", () => {
    // The bug guarded: the sidebar had no toggle, so the board could not take
    // the width back. The shared rail component names the action, carries the
    // state, and the labels are the ones the sheet fades.
    expect(markup).toContain('data-collapsed="false"');
    expect(markup).toContain('aria-label="Collapse sidebar"');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain("gx-kan-brand-name gx-rail-label");
    expect(markup).toContain('aria-label="My Time"');
  });

  it("prints the header, both member rows and the tabs", () => {
    expect(markup).toContain("Add Member");
    expect(markup).toContain("Filter");
    expect(markup).toContain('class="gx-kan-people"');
    for (const tab of [
      "Overview",
      "Tasks",
      "Timeline",
      "Notes",
      "Files",
      "Members",
    ]) {
      expect(markup).toContain(tab);
    }
    expect(markup).toContain('aria-selected="true"');
  });

  it("prints four columns with a count chip and an add control each", () => {
    for (const column of kanbanColumns) {
      expect(markup).toContain(column.label);
      expect(markup).toContain(`aria-label="Add a card to ${column.title}"`);
    }
    expect(markup.match(/gx-kan-column-count/g)?.length).toBe(4);
    expect(markup.match(/gx-kan-dot/g)?.length).toBe(4);
    expect(countCards(initialKanbanCards)).toEqual({
      todo: 2,
      progress: 3,
      review: 1,
      done: 2,
    });
  });

  it("prints the cards with a project chip, a priority tint and their counts", () => {
    expect(markup).toContain(
      "Update the Design System to Support Dark Mode and High Contrast Themes",
    );
    expect(markup).toContain(
      "Sketch out initial wireframes for the main screen",
    );
    expect(markup).toContain("Map Component");
    expect(markup).toContain("Create custom icons");
    expect(markup).toContain("Due Date:");
    for (const priority of ["high", "medium", "low"]) {
      expect(markup).toContain(`data-priority="${priority}"`);
    }
    expect(markup).toContain("gx-kan-avatars");
    expect(markup).toContain("gx-kan-meta");
  });

  it("gives every card a menu affordance", () => {
    expect(markup).toContain('aria-haspopup="menu"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup.match(/aria-haspopup="menu"/g)?.length).toBe(
      initialKanbanCards.length,
    );
  });
});

describe("moving a card", () => {
  it("changes only the moved card's column", () => {
    const moved = moveCard(initialKanbanCards, "design-system", "done");
    const card = moved.find((entry) => entry.id === "design-system");

    expect(card?.column).toBe("done");
    expect(card?.title).toBe(initialKanbanCards[0]?.title);
    expect(moved.filter((entry) => entry.id !== "design-system")).toEqual(
      initialKanbanCards.filter((entry) => entry.id !== "design-system"),
    );
  });

  it("updates both the source and the target column counts", () => {
    const counts = countCards(
      moveCard(initialKanbanCards, "design-system", "done"),
    );

    expect(counts.todo).toBe(1);
    expect(counts.done).toBe(3);
    expect(counts.progress).toBe(3);
    expect(counts.review).toBe(1);
  });

  it("keeps the total number of cards", () => {
    expect(
      countCards(moveCard(initialKanbanCards, "wireframes", "review")).review,
    ).toBe(2);
    expect(moveCard(initialKanbanCards, "wireframes", "review")).toHaveLength(
      initialKanbanCards.length,
    );
  });
});

describe("adding a card", () => {
  it("appends a placeholder to the chosen column and raises its count", () => {
    const added = addCard(initialKanbanCards, "review");
    const card = added[added.length - 1];

    expect(card).toMatchObject({
      column: "review",
      title: "New task",
      priority: "Low",
      due: "No due date",
    });
    expect(countCards(added).review).toBe(2);
  });

  it("never repeats a placeholder id", () => {
    const once = addCard(initialKanbanCards, "todo");
    const twice = addCard(once, "todo");

    expect(twice[twice.length - 1]?.id).not.toBe(twice[twice.length - 2]?.id);
  });
});
