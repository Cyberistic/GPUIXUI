import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { transcript } from "./agent/data.js";
import { revealed, send } from "./agent/logic.js";
import { events } from "./calendar/data.js";
import { layoutDay, visible, weekStart } from "./calendar/logic.js";
import { results } from "./launcher/data.js";
import { vaultNotes } from "./vault/data.js";
import { backlinks, edges, linksFrom, spans } from "./vault/logic.js";
import { moveHighlight, rank } from "./launcher/logic.js";
import { watches } from "./menubar/data.js";
import { statusLine, toggle } from "./menubar/logic.js";
import { notes } from "./notes/data.js";
import { editNote, excerpt, notesIn } from "./notes/logic.js";
import { panes } from "./preferences/data.js";
import { panesMatching } from "./preferences/logic.js";
import { neighbour } from "./viewer/logic.js";
import { stepAfter } from "./welcome/logic.js";

describe("notes", () => {
  it("shows one folder's notes and every note under All notes", () => {
    expect(Arr.every(notesIn(notes, "Exam"), (n) => n.folder === "Exam")).toBe(
      true,
    );
    expect(notesIn(notes, "All notes")).toHaveLength(notes.length);
  });

  it("cuts an excerpt on one line, with an ellipsis", () => {
    expect(excerpt("a\nb", 10)).toBe("a b");
    expect(excerpt("x".repeat(80), 10)).toBe(`${"x".repeat(9)}…`);
  });

  it("rewrites only the edited note", () => {
    const edited = editNote(notes, "n2", "Sushi found.");
    expect(edited.find((n) => n.id === "n2")?.body).toBe("Sushi found.");
    expect(edited.find((n) => n.id === "n1")).toBe(notes[0]);
  });
});

describe("preferences", () => {
  it("matches a search ignoring case", () => {
    expect(Arr.map(panesMatching(panes, "NOTIF"), (p) => p.id)).toEqual([
      "notifications",
    ]);
    expect(panesMatching(panes, "  ")).toHaveLength(panes.length);
  });
});

describe("launcher", () => {
  it("ranks a prefix match first within a group", () => {
    expect(rank(results, "rel")[0]?.id).toBe("releases");

    expect(Arr.map(rank(results, "re"), (r) => r.id)).toEqual([
      "releases",
      "new-release",
      "replays",
    ]);
  });

  it("clamps the highlight to the list", () => {
    expect(moveHighlight(3, 2, 1)).toBe(2);
    expect(moveHighlight(3, 0, -1)).toBe(0);
  });
});

describe("menu bar", () => {
  it("counts the watches that are on, and pauses at none", () => {
    expect(statusLine(watches)).toBe("Watching 2 of 4");
    expect(statusLine(toggle(watches, "auction"))).toBe("Watching 3 of 4");
    expect(statusLine(Arr.map(watches, (w) => ({ ...w, on: false })))).toBe(
      "Paused",
    );
  });
});

describe("agent", () => {
  it("appends the prompt and a reply, and sends nothing blank", () => {
    expect(send(transcript, "  ")).toBe(transcript);
    const next = send(transcript, "add a test");
    expect(Arr.map(Arr.takeRight(next, 2), (t) => t.from)).toEqual([
      "you",
      "agent",
    ]);
  });
});

describe("agent streaming", () => {
  it("reveals a reply word by word, then whole", () => {
    expect(revealed("On it — reading the files", 2)).toBe("On it");
    expect(revealed("On it", 9)).toBe("On it");
    expect(revealed("On it", 0)).toBe("");
  });
});

describe("calendar", () => {
  it("puts overlapping events side by side", () => {
    const monday = layoutDay(Arr.filter(events, (e) => e.day === 0));
    expect(Arr.map(monday, (p) => [p.event.id, p.lane, p.lanes])).toEqual([
      ["e1", 0, 2],
      ["e2", 1, 2],
    ]);
  });

  it("keeps a lone event full width", () => {
    expect(layoutDay(Arr.filter(events, (e) => e.day === 2))[0]?.lanes).toBe(1);
  });

  it("steps whole weeks across a month", () => {
    expect(weekStart("2026-11-02", 4)).toBe("2026-11-30");
    expect(weekStart("2026-11-02", -1)).toBe("2026-10-26");
  });

  it("hides a calendar that is switched off", () => {
    expect(
      Arr.some(visible(events, ["exam"]), (e) => e.calendar !== "exam"),
    ).toBe(false);
  });
});

describe("welcome and viewer", () => {
  it("stops Continue at the last step", () => {
    expect(stepAfter(1, 3)).toBe(2);
    expect(stepAfter(2, 3)).toBe(2);
  });

  it("steps photos without wrapping", () => {
    expect(neighbour(["a", "b", "c"], "c", 1)).toBe("c");
    expect(neighbour(["a", "b", "c"], "b", -1)).toBe("a");
  });
});

describe("vault", () => {
  it("splits a paragraph into text and links, in order", () => {
    expect(spans("see [[ten]] and [[nen]].")).toEqual([
      { _tag: "Text", text: "see " },
      { _tag: "Link", id: "ten" },
      { _tag: "Text", text: " and " },
      { _tag: "Link", id: "nen" },
      { _tag: "Text", text: "." },
    ]);
  });

  it("every link names a note the vault holds", () => {
    const ids = vaultNotes.map((note) => note.id);
    for (const note of vaultNotes)
      for (const link of linksFrom(note)) expect(ids).toContain(link);
  });

  it("backlinks are the notes that link here, and edges are undirected", () => {
    expect(backlinks(vaultNotes, "ten").map((note) => note.id)).toEqual([
      "nen",
    ]);
    // nen → ten and ten → nen are stated by both notes, and draw one edge.
    expect(
      edges(vaultNotes).filter(([a, b]) => a === "nen" && b === "ten"),
    ).toHaveLength(1);
  });
});
