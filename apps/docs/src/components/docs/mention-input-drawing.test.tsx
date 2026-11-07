import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  initialsOf,
  matchParts,
  mentionRuns,
  MENTION_PEOPLE,
  MentionInputDemo,
  openToken,
  rankPeople,
} from "./mention-input-demo";

const read = (path: string): string =>
  readFileSync(new URL(`../../../../../${path}`, import.meta.url), "utf8");

const demoSource = read("apps/docs/src/components/docs/mention-input-demo.tsx");
const css = read("apps/docs/src/styles/demos.css");

const rule = (selector: string): string => {
  const start = css.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`no ${selector} block`);
  return css.slice(start, css.indexOf("}", start));
};

const markup = renderToStaticMarkup(<MentionInputDemo />);

describe("the token rule", () => {
  it("opens on the last `@` that follows whitespace, with nothing after it", () => {
    expect(openToken("Ship it with @ka")).toEqual({ start: 13, query: "ka" });
    expect(openToken("@ada")).toEqual({ start: 0, query: "ada" });
  });

  it("is closed once the token has a space in it", () => {
    expect(openToken("Ship it with @ada ")).toBeUndefined();
    expect(openToken("mail me at a@b")).toBeUndefined();
    expect(openToken("no token here")).toBeUndefined();
  });
});

describe("a mention becomes a link only when it names someone", () => {
  it("splits the field into runs, with mentions separated", () => {
    const runs = mentionRuns(
      "Ship it with @katherine and @ada.",
      MENTION_PEOPLE,
    );

    expect(runs).toEqual([
      { kind: "text", text: "Ship it with " },
      { kind: "mention", handle: "katherine", name: "Katherine Johnson" },
      { kind: "text", text: " and " },
      { kind: "mention", handle: "ada", name: "Ada Lovelace" },
      { kind: "text", text: "." },
    ]);
  });

  it("leaves a `@name` that names nobody as text", () => {
    expect(mentionRuns("hello @nobody", MENTION_PEOPLE)).toEqual([
      { kind: "text", text: "hello " },
      { kind: "text", text: "@nobody" },
    ]);
  });

  it("reads a handle without regard to case", () => {
    expect(mentionRuns("@Ada", MENTION_PEOPLE)).toEqual([
      { kind: "mention", handle: "ada", name: "Ada Lovelace" },
    ]);
  });
});

describe("the ranking", () => {
  it("puts a prefix match before a substring match", () => {
    const people = [
      { name: "Nadine Ada", handle: "nadine", role: "Design" },
      { name: "Ada Lovelace", handle: "ada", role: "Systems" },
    ];

    expect(rankPeople(people, "ada").map((person) => person.handle)).toEqual([
      "ada",
      "nadine",
    ]);

    expect(rankPeople(people, "ad").map((person) => person.handle)).toEqual([
      "ada",
      "nadine",
    ]);
  });

  it("matches the handle as well as the name", () => {
    expect(rankPeople(MENTION_PEOPLE, "grace").map((p) => p.handle)).toEqual([
      "grace",
    ]);
    expect(rankPeople(MENTION_PEOPLE, "zzz")).toEqual([]);
  });
});

describe("the match a row explains itself with", () => {
  it("splits a label around the matched run", () => {
    expect(matchParts("Katherine Johnson", "kat")).toEqual({
      before: "",
      match: "Kat",
      after: "herine Johnson",
    });
    expect(matchParts("Katherine Johnson", "")).toEqual({
      before: "Katherine Johnson",
      match: "",
      after: "",
    });
  });

  it("paints a disc from the name's first two words", () => {
    expect(initialsOf("Katherine Johnson")).toBe("KJ");
    expect(initialsOf("Ada")).toBe("A");
  });
});

describe("the field as the reader sees it", () => {
  it("paints the mention as a link inside the field, not as plain text", () => {
    expect(markup).toContain('class="gx-mention-run"');
    expect(markup).toContain("@katherine");
    expect(rule(".gx-mention-run")).toContain("text-decoration: underline");

    expect(markup).toContain('class="gx-mention-mirror"');
    expect(markup).toContain('class="gx-mention-input"');

    const input = css.slice(
      css.indexOf("/* The real field: transparent ink"),
      css.indexOf("}", css.indexOf("/* The real field: transparent ink")),
    );
    expect(input).toContain("color: transparent");
    expect(input).toContain("caret-color: var(--foreground)");
    expect(rule(".gx-mention-composer")).toContain("display: grid");

    const shared = css.slice(
      css.indexOf(".gx-mention-mirror,\n.gx-mention-input {"),
      css.indexOf("}", css.indexOf(".gx-mention-mirror,\n.gx-mention-input {")),
    );
    for (const metric of [
      "padding:",
      "font-family:",
      "font-size:",
      "line-height:",
      "white-space:",
    ]) {
      expect(shared).toContain(metric);
    }
  });

  it("grows with its content instead of staying one line", () => {
    expect(demoSource).toContain("rows={2}");
    expect(demoSource).toContain("<textarea");
  });

  it("counts the mentions it painted, and drops the debug readout", () => {
    expect(markup).toContain("1 mentioned");
    expect(markup).not.toContain('query: ""');
  });
});

describe("the box below the mention", () => {
  it("wears the popover recipe and hangs under the field, not the card", () => {
    const list = rule(".gx-mention-list");

    expect(list).toContain("background: var(--popover)");
    expect(list).toContain("border: 1px solid var(--border)");
    expect(list).toContain("box-shadow: var(--elevation-lg)");

    expect(rule(".gx-mention-composer")).toContain("position: relative");
    expect(list).toContain("top: calc(100% + 4px)");
  });

  it("gives the scene the height the overlay needs", () => {
    expect(rule(".gx-mention")).toContain("min-height: 320px");
  });

  it("rows carry a disc, a name, a handle and a role", () => {
    expect(rule(".gx-mention-disc")).toContain("border-radius: 9999px");
    expect(rule(".gx-mention-handle")).toContain("font-size:");
    expect(rule(".gx-mention-item mark")).toContain("color: var(--ring)");
    expect(demoSource).toContain("gx-mention-identity");
    expect(demoSource).toContain("person.role");
  });

  it("says so when nobody matches", () => {
    expect(demoSource).toContain("gx-mention-empty");
    expect(demoSource).toContain("No one matches");
  });
});
