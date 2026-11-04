import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Terminal } from "./terminal";

/**
 * The terminal moment, held to its shape.
 *
 * The block types the documented command and then opens the editor **inside
 * the same frame** — a second window beside the terminal would claim the app
 * runs in a GUI, which is the opposite of what the section says. The cases hold
 * one frame, the documented command and guide link, and the editor controls
 * that prove the file tree and sidebar are real: file presses, tabs and a
 * collapse toggle.
 */

const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const markup = renderToStaticMarkup(<Terminal />);
const source = read("./terminal.tsx");
const css = read("../../styles/landing.css");
const record = read("../../../../../docs/gpuix-capabilities.md");

const count = (pattern: RegExp): number => markup.match(pattern)?.length ?? 0;

describe("the terminal moment", () => {
  it("mounts one frame, not a terminal beside an editor", () => {
    expect(count(/class="landing-term"/g)).toBe(1);
    expect(count(/class="landing-editor"/g)).toBe(1);
    // The editor is inside the terminal's markup, so the frame is one window.
    expect(markup.indexOf('class="landing-term"')).toBeLessThan(
      markup.indexOf('class="landing-editor"'),
    );
    expect(markup).not.toContain('class="landing-vscode-title"');
    expect(markup).toContain('data-stage="typing"');
  });

  it("types the command the capability record documents", () => {
    expect(record).toContain("GPUIX_TERMINAL=1 code GPUIXUI");
    expect(markup).toContain("GPUIX_TERMINAL=1 code GPUIXUI");
    expect(markup).toContain("opening GPUIXUI — terminal mode");
    expect(markup).toContain('href="/platform/terminal"');
  });

  it("waits for the reader to reach it before typing", () => {
    expect(source).toContain("new IntersectionObserver");
    expect(source).toContain("threshold: 0.3");
    expect(source).toContain("if (!armed) return undefined;");
    expect(markup).toContain('style="width:0ch"');
  });

  it("makes the file tree and the sidebar real controls", () => {
    expect(markup).toContain("landing-term-tree");
    expect(count(/class="gx-filetree"/g)).toBeGreaterThan(0);
    // The tree logic is the package's, but the explorer keeps VS Code's chrome:
    // no demo scene (border, dot field, 40px padding) around it.
    expect(markup).not.toContain("gx-base gx-demo landing-term-tree");
    expect(markup).toContain(">Explorer<");
    expect(markup).toContain("landing-vscode-ts");
    expect(css).toContain(".landing-term-tree .gx-filetree");
    expect(markup).toContain('aria-label="Collapse sidebar"');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('data-sidebar="true"');
    // One tab per file, each a role=tab that switches the buffer.
    for (const name of ["page.tsx", "button.tsx", "theme.ts"]) {
      expect(markup).toContain(`>${name}<`);
      expect(markup).toContain(`data-reorder-tab="${name}"`);
      expect(markup).toContain(`aria-label="Close ${name}"`);
    }
    expect(css).toContain("transition: width 0.28s ease");
    expect(css).toContain('[data-sidebar="false"]');
  });

  it("lets the editor tabs reorder and close with the editor's motion", () => {
    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('aria-label="Open editor files"');
    expect(source).toContain("ReorderableTabs");
    expect(markup).toContain("Close page.tsx");
    expect(css).toContain('[data-dragging="true"]');
    expect(css).toContain('[data-closing="true"]');
  });

  it("opens the library's own components in the code pane", () => {
    expect(markup).toContain('data-current="true">page.tsx');
    expect(markup).toContain('data-current="true"');
    for (const name of ["Button", "Stack", "ThemeProvider"]) {
      expect(markup).toContain(`<span class="vsc-tok-tag">${name}</span>`);
    }
    expect(markup).toContain("@/gpuixui");
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
  });

  it("offers one replay and drops the motion when asked", () => {
    expect(markup).toContain('aria-label="Replay the terminal animation"');
    const reduced = css.slice(css.lastIndexOf("prefers-reduced-motion"));
    expect(reduced).toContain(".landing-editor .landing-vscode-explorer");
    expect(reduced).toContain("transition: none");
  });

  it("no longer claims three native looks in the editor sample", () => {
    expect(markup).not.toContain("One set, three native looks.");
    expect(source).not.toContain("landingLookCount");
  });
});
