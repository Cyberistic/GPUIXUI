import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { retroNames, retroStyles } from "@gpuixui/tokens";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Hero } from "./deck";
import { Defaults } from "./landing";
import { Terminal } from "./terminal";
import { countWord, landingLookCount, platforms } from "./data";

/**
 * The landing's look counts and the authored-look cards.
 *
 * The page told three counts of the same thing: the hero said **four** native
 * looks, the terminal sample said **three**, and the "Defaults" section was
 * headed "Three native looks" while rendering **two** cards. The cards also
 * credited Luna and Aero with "Segoe/Tahoma", the two UI faces `retroStyles`
 * deliberately does not name (the package bundles no font, so a look keeps the
 * runtime's sentinel). A marketing page may round prose, but a count a reader
 * can see next to the grid it describes is a claim, and this one contradicted
 * itself twice.
 *
 * The deck and the sample now print one count derived from
 * `landingPlatformOrder`; the section prints one card per `retroNames` entry,
 * labelled and measured by `retroStyles`. This guard renders the three surfaces
 * and holds them to the package lists, so a new desktop or look moves the copy
 * with it.
 */

const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const landing = renderToStaticMarkup(<Defaults />);
const cards = landing.split('class="landing-panel landing-recipe"').slice(1);

const cardFor = (look: string): string =>
  cards.find((card) => card.includes(`data-look="${look}"`)) ?? "";

describe("the landing's look counts", () => {
  it("prints the deck's own count in the hero and the terminal sample", () => {
    const word = countWord(landingLookCount);

    expect(landingLookCount).toBe(platforms.length);
    expect(renderToStaticMarkup(<Hero />)).toContain(
      `${word} native <em>looks</em>`,
    );
    expect(renderToStaticMarkup(<Terminal />)).toContain(
      `One set, ${word.toLowerCase()} native looks.`,
    );
  });

  it("keeps the retired three-look sentence out of the source", () => {
    const source = ["landing.tsx", "deck.tsx", "terminal.tsx"]
      .map((file) => read(file))
      .join("\n");

    expect(source).not.toMatch(/[Tt]hree native looks/);
  });
});

describe("the landing's authored looks", () => {
  it("renders one card per authored look, in the package's order", () => {
    expect(cards).toHaveLength(retroNames.length);
    retroNames.forEach((name, index) => {
      const card = cards[index] ?? "";
      expect(card).toContain(`data-look="${name}"`);
      expect(card).toContain(retroStyles[name].label);
    });
  });

  it("prints each look's own density, corner and mono face", () => {
    retroNames.forEach((name) => {
      const card = cardFor(name);

      expect(card).toContain(retroStyles[name].density);
      expect(card).toContain(`${retroStyles[name].radius.md}px corners`);
      expect(card).toContain(retroStyles[name].mono);
    });
  });

  it("sends every card to the look picker", () => {
    expect(
      cards.every((card) => card.includes('href="/theming#the-look-picker"')),
    ).toBe(true);
  });

  it("counts the cards it renders", () => {
    expect(landing).toContain(`${countWord(retroNames.length)} authored looks`);
  });

  it("does not name a UI face the looks cannot ship", () => {
    // Bug guarded: "Segoe/Tahoma" in the Luna/Aero card, where the package
    // keeps the runtime's sentinel for the UI face.
    expect(read("landing.tsx")).not.toMatch(/Segoe|Tahoma/);
  });
});
