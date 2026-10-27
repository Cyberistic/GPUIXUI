import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Terminal } from "./terminal";

/**
 * The editor moment, held to its shape.
 *
 * The block used to be a static two-pane picture: a kitty frame beside a code
 * sample. It now types the documented install command, prints the shell's
 * answer, and opens a VS Code window on `src/app/page.tsx` — so the cases below
 * hold the sequence's three parts in one render (typing, the command's output,
 * the editor), the command to the page that documents it, and the VS Code chrome
 * the claim rests on. They assert structure, not a screenshot: the colours are
 * measured in `landing-theme.test.ts` and looked at in the screenshots.
 */

const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const markup = renderToStaticMarkup(<Terminal />);
const css = read("../../styles/landing.css");
const installation = read("../../../content/docs/installation.mdx");

const count = (pattern: RegExp): number => markup.match(pattern)?.length ?? 0;

describe("the editor moment", () => {
  it("mounts the whole sequence, starting in the terminal", () => {
    // The stage opens on the terminal, and the editor it opens is already in
    // the DOM (the stylesheet reveals it), so the last frame is the server's
    // markup and not a client-only mount.
    expect(markup).toContain('data-stage="typing"');
    expect(count(/class="landing-term"/g)).toBe(1);
    expect(count(/class="landing-vscode"/g)).toBe(1);
    expect(markup).toContain('class="landing-term-out"');
  });

  it("types the command the installation page documents", () => {
    // A landing command that no page documents is an invented CLI. This one is
    // read out of the page a reader is sent to.
    const documented = [
      ...installation.matchAll(/(nub add @gpuixui\/[a-z-]+@workspace:\*)/g),
    ].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));
    const typed = documented.filter((command) => markup.includes(command));

    expect(typed).toEqual(["nub add @gpuixui/primitives@workspace:*"]);
    expect(markup).toContain("added @gpuixui/primitives");
    expect(markup).toContain('href="/docs/installation"');
  });

  it("reproduces the VS Code window, not a generic editor", () => {
    // Title bar with the three traffic lights, activity bar, explorer, tabs,
    // breadcrumbs, minimap and status bar: one mark for each.
    expect(count(/class="landing-vscode-lights"/g)).toBe(1);
    expect(count(/data-light=/g)).toBe(3);
    expect(count(/class="landing-vscode-body"/g)).toBe(1);
    expect(count(/class="landing-vscode-action/g)).toBe(7);
    expect(markup).toContain('data-active="true"');
    expect(count(/class="landing-vscode-explorer"/g)).toBe(1);
    expect(count(/class="landing-vscode-row"/g)).toBe(8);
    expect(count(/class="landing-vscode-tab"/g)).toBe(2);
    expect(count(/class="landing-vscode-minimap"/g)).toBe(1);
    expect(markup).toContain(">Explorer<");
    expect(markup).toContain("Ln 15, Col 22");
    expect(markup).toContain(">TypeScript React<");
  });

  it("opens src/app/page.tsx on the library's own components", () => {
    expect(markup).toContain("page.tsx — gpuixui");
    expect(count(/data-current="true"/g)).toBe(3);
    expect(markup).toContain('data-kind="tsx"');
    expect(markup).toContain(">src<");
    expect(markup).toContain(">app<");
    for (const name of ["Button", "Input", "Stack", "Text", "ThemeProvider"]) {
      expect(markup).toContain(`<span class="vsc-tok-tag">${name}</span>`);
    }
    expect(markup).toContain("@gpuixui/primitives");
    // The look count is still one number: the editor prints the deck's count.
    expect(markup).toContain("One set, three native looks.");
    // Every role the token table names has a colour rule, so a new role cannot
    // silently paint the editor's default ink.
    for (const role of [
      "keyword",
      "tag",
      "attr",
      "string",
      "fn",
      "var",
      "punct",
      "plain",
    ]) {
      expect(markup).toContain(`class="vsc-tok-${role}"`);
    }
    // The number role has no literal in this sample, but the table defines it,
    // so the stylesheet must still paint it.
    for (const role of ["num"]) expect(css).toContain(`.vsc-tok-${role}`);
  });

  it("keeps the film out of the accessibility tree and offers a replay", () => {
    // Both windows are pictures; the reader's control is the button under them.
    expect(markup).toContain('aria-hidden="true" class="landing-term"');
    expect(markup).toContain('aria-hidden="true" class="landing-vscode"');
    expect(markup).toContain('aria-label="Replay the terminal animation"');
    expect(count(/type="button"/g)).toBe(1);
  });

  it("shows the editor at once when the reader asks for less motion", () => {
    const reduced = css.slice(css.lastIndexOf("prefers-reduced-motion"));

    expect(reduced).toContain(".landing-moment .landing-vscode");
    expect(reduced).toContain("opacity: 1");
    expect(reduced).toContain("transform: none");
    expect(reduced).toContain(".landing-term-caret");
    expect(reduced).toContain("animation: none");
  });
});
