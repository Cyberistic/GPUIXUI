import { renderToStaticMarkup } from "react-dom/server";
import * as Arr from "effect/Array";
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

const markup = renderToStaticMarkup(<KanbanRender />);

describe("dragging a card", () => {
  it("paints each card as a drag source and each column as a drop target", () => {
    expect(markup).toContain('draggable="true"');
    expect(markup).toContain('data-card-id="exam"');
  });

  it("lands the card at the index the drop names", () => {
    const moved = moveCardTo(initialKanbanCards, "exam", "cleared", 0);
    const cleared = moved.filter((card) => card.column === "cleared");

    expect(cleared[0]?.id).toBe("exam");
    expect(moved.filter((card) => card.column === "open").length).toBe(
      initialKanbanCards.filter((card) => card.column === "open").length - 1,
    );
  });

  it("reorders inside one column", () => {
    const hunting = initialKanbanCards.filter(
      (card) => card.column === "hunting",
    );
    const last = hunting[hunting.length - 1];
    const moved = moveCardTo(initialKanbanCards, last?.id ?? "", "hunting", 0);

    expect(moved.filter((card) => card.column === "hunting")[0]?.id).toBe(
      last?.id,
    );
  });

  it("appends past the end of the column", () => {
    const moved = moveCardTo(initialKanbanCards, "exam", "review", 99);

    expect(moved.filter((card) => card.column === "review").at(-1)?.id).toBe(
      "exam",
    );
  });

  it("ignores an id the list no longer holds", () => {
    expect(moveCardTo(initialKanbanCards, "removed", "cleared", 0)).toBe(
      initialKanbanCards,
    );
  });
});

describe("kanban board block markup", () => {
  it("prints the app sidebar, its groups and the user row", () => {
    expect(markup).toContain("HUNTERS");
    Arr.forEach(
      [
        "Schedule",
        "Assignments",
        "Contracts",
        "Bounties",
        "Yorknew",
        "Greed Island",
        "Dark Continent",
        "Zoldyck Estate",
        "Help",
        "⌘F",
        "gon@hunter.assoc",
      ],
      (label) => expect(markup).toContain(label),
    );
    expect(markup).toContain('aria-current="page"');
    expect(markup).not.toContain("Hologram");
  });

  it("collapses the app sidebar to an icon strip", () => {
    expect(markup).toContain('data-collapsed="false"');
    expect(markup).toContain('aria-label="Collapse sidebar"');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain("gx-kan-brand-name gx-rail-label");
    expect(markup).toContain('aria-label="Schedule"');
  });

  it("prints the header, the member row and the tabs", () => {
    expect(markup).toContain("Add Hunter");
    expect(markup).toContain("Filter");
    expect(markup).toContain('class="gx-kan-people"');
    Arr.forEach(
      ["Overview", "Hunts", "Timeline", "Notes", "Files", "Hunters"],
      (tab) => expect(markup).toContain(tab),
    );
    expect(markup).toContain('aria-selected="true"');
    expect(markup).not.toContain("gx-kan-project");
    expect(markup).not.toContain("gx-kan-mark");
  });

  it("prints four columns with a count chip and an add control each", () => {
    for (const column of kanbanColumns) {
      expect(markup).toContain(column.label);
      expect(markup).toContain(`aria-label="Add a card to ${column.title}"`);
    }
    expect(markup.match(/gx-kan-column-count/g)?.length).toBe(4);
    expect(markup.match(/gx-kan-dot/g)?.length).toBe(4);
    expect(countCards(initialKanbanCards)).toEqual({
      open: 2,
      hunting: 3,
      review: 1,
      cleared: 2,
    });
  });

  it("prints the cards with a project chip, a priority tint and their counts", () => {
    expect(markup).toContain("Survive the Fourth Phase");
    expect(markup).toContain("Follow Ging");
    expect(markup).toContain("Track the Phantom Troupe");
    expect(markup).toContain("Earn the Hunter Licence");
    expect(markup).toContain("Due:");
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
    const moved = moveCard(initialKanbanCards, "exam", "cleared");
    const card = moved.find((entry) => entry.id === "exam");

    expect(card?.column).toBe("cleared");
    expect(card?.title).toBe(initialKanbanCards[0]?.title);
    expect(moved.filter((entry) => entry.id !== "exam")).toEqual(
      initialKanbanCards.filter((entry) => entry.id !== "exam"),
    );
  });

  it("updates both the source and the target column counts", () => {
    const counts = countCards(moveCard(initialKanbanCards, "exam", "cleared"));

    expect(counts.open).toBe(1);
    expect(counts.cleared).toBe(3);
    expect(counts.hunting).toBe(3);
    expect(counts.review).toBe(1);
  });

  it("keeps the total number of cards", () => {
    expect(
      countCards(moveCard(initialKanbanCards, "ging", "review")).review,
    ).toBe(2);
    expect(moveCard(initialKanbanCards, "ging", "review")).toHaveLength(
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
      title: "New hunt",
      priority: "Low",
      due: "No due date",
    });
    expect(countCards(added).review).toBe(2);
  });

  it("never repeats a placeholder id", () => {
    const once = addCard(initialKanbanCards, "open");
    const twice = addCard(once, "open");

    expect(twice[twice.length - 1]?.id).not.toBe(twice[twice.length - 2]?.id);
  });
});
