/**
 * The landing's claims (plan 727).
 *
 * Bugs guarded: a hero that plays no native footage (or plays it to a reader
 * who asked for less motion), sections that argue against the product with
 * "Browser preview" captions, a number printed that the bench never measured,
 * a block tile linking to a page that does not exist, a video over its budget,
 * and the retired Hunter identity creeping back.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import raw from "../../lib/proof.json";
import { landingBlocks } from "./blocks-strip";
import { Hero, heroMedia } from "./hero";
import { credit, Landing } from "./landing";
import { feelClips } from "./feel";
import { proofFigures } from "./proof";

const at = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const publicFile = (path: string) => at(`../../../public${path}`);

describe("the landing", () => {
  it("plays native footage with a poster and a label", () => {
    const hero = renderToStaticMarkup(<Hero />);
    expect(hero).toContain(`poster="${heroMedia.poster}"`);
    expect(hero).toContain(`aria-label="${heroMedia.label}"`);
    expect(hero).toContain(heroMedia.mp4);
  });

  it("keeps every hero file in the repository and within budget", () => {
    const sizes = [heroMedia.mp4, heroMedia.webm, heroMedia.poster].map(
      (path) => statSync(publicFile(path)).size,
    );
    expect(Math.max(...sizes)).toBeLessThanOrEqual(3 * 1024 * 1024);
  });

  it("plays five recorded feel loops, each with its poster, within budget", () => {
    const page = renderToStaticMarkup(<Landing />);
    for (const clip of feelClips) {
      expect(page).toContain(`/media/landing/feel-${clip.id}.mp4`);
      for (const ext of ["mp4", "jpg"]) {
        const size = statSync(
          publicFile(`/media/landing/feel-${clip.id}.${ext}`),
        ).size;
        expect(size).toBeLessThanOrEqual(800 * 1024);
      }
    }
  });

  it("prints only the numbers the bench wrote", () => {
    expect(proofFigures.map((figure) => figure.value)).toEqual([
      `${raw.coldStartMs} ms`,
      `${raw.idleRssMb} MB`,
      `${raw.installMb} MB`,
    ]);
    const source = readFileSync(at("./proof.tsx"), "utf8");
    expect(source).not.toMatch(/\d+ ?(ms|MB)\b/);
  });

  it("links every block tile to a block page and its image", () => {
    const pages = readdirSync(at("../../../content/docs/blocks"));
    for (const block of landingBlocks) {
      expect(pages, block.slug).toContain(`${block.slug}.mdx`);
      expect(
        statSync(publicFile(`/blocks/${block.slug}.webp`)).size,
      ).toBeGreaterThan(0);
    }
  });

  it("argues with no browser-preview captions outside the code sample", () => {
    const page = renderToStaticMarkup(<Landing />);
    expect(page.match(/Browser preview|browser preview/g) ?? []).toHaveLength(
      1,
    );
    expect(page).toContain('href="/live"');
  });

  it("says nothing about hunters' licences", () => {
    const page = renderToStaticMarkup(<Landing />);
    expect(page).not.toMatch(/Hunter License|licence card/i);
  });

  it("ends with the maker's line, the handle an underlined link to the site", () => {
    const page = renderToStaticMarkup(<Landing />);
    const line = page.slice(page.indexOf('class="landing-credit"'));
    expect(line).toContain("Made with ☕ by");
    expect(line).toContain(`href="${credit.href}"`);
    expect(line).toContain(`>${credit.handle}</a>`);
    expect(page.indexOf('class="landing-credit"')).toBeGreaterThan(
      page.lastIndexOf("landing-footer"),
    );
    const css = readFileSync(at("../../styles/landing.css"), "utf8");
    expect(css.slice(css.indexOf(".landing-credit a {"))).toMatch(
      /^[^}]*text-decoration: underline/,
    );
  });
});
