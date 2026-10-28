import { diffStrings, numberDiff } from "@gpuixui/editor/diff/logic";
import {
  closeFences,
  markdownStats,
  statsLabel,
} from "@gpuixui/editor/markdown/logic";
import { findRanges, replaceAll } from "@gpuixui/editor/search/logic";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CODE_SAMPLE, CodeEditorDemo } from "./code-editor-demo";
import { tokenize } from "./code-editor-preview";
import {
  DIFF_AFTER,
  DIFF_BEFORE,
  diffRows,
  DiffViewerDemo,
} from "./diff-viewer-demo";
import { MARKDOWN_SAMPLE, MarkdownEditorDemo } from "./markdown-editor-demo";
import { parseMarkdown } from "./markdown-preview";
import {
  FIND_QUERY,
  FIND_REPLACEMENT,
  FIND_SAMPLE,
  replaceRange,
  SearchReplaceDemo,
} from "./search-replace-demo";

/**
 * The editor lane's previews.
 *
 * Four package pages now mount a labelled browser approximation, and each one
 * runs the shipped logic — the diff's edit script, the markdown fence rule, the
 * find scan and the replace-all. These cases hold the drawing to that logic and
 * to the states the pages document.
 */

const html = (node: Parameters<typeof renderToStaticMarkup>[0]): string =>
  renderToStaticMarkup(node);

describe("the Code editor preview", () => {
  it("keeps every character of a line across its tokens", () => {
    CODE_SAMPLE.split("\n").forEach((line) =>
      expect(
        tokenize(line)
          .map((token) => token.text)
          .join(""),
      ).toBe(line),
    );
  });

  it("classifies a keyword, a string, a comment and a number", () => {
    const kinds = tokenize(
      'const label = "save"; // the action\nreturn 42;',
    ).map((token) => `${token.kind}:${token.text}`);

    expect(kinds).toContain("keyword:const");
    expect(kinds).toContain('string:"save"');
    expect(kinds).toContain("number:42");
    expect(kinds).toContain("keyword:return");
    expect(kinds).toContain("comment:// the action");
    // A word that merely starts with a keyword stays plain text.
    expect(tokenize("constant")).toEqual([{ kind: "plain", text: "constant" }]);
  });

  it("draws the gutter, the token layer and the read-only state", () => {
    const markup = html(<CodeEditorDemo />);
    const lines = CODE_SAMPLE.split("\n").length;

    expect(markup.match(/class="gx-codeedit-line"/g)).toHaveLength(lines);
    expect(markup).toContain(`>${lines}<`); // the last gutter number
    expect(markup).toContain('aria-label="Code editor"');
    expect(markup).toContain('class="gx-tok-keyword"');
    expect(markup).toContain("Read only");
  });
});

describe("the Diff viewer preview", () => {
  it("paints the package's edit script, not a hand-written one", () => {
    const rows = diffRows();
    const kinds = numberDiff(diffStrings(DIFF_BEFORE, DIFF_AFTER)).map(
      (row) => row.kind,
    );

    expect(rows.map((row) => row.kind)).toEqual(kinds);
    expect(kinds).toContain("removed");
    expect(kinds).toContain("added");
    expect(rows.some((row) => row.text.includes("base + tax"))).toBe(true);
  });

  it("draws both modes and the changed rows", () => {
    const markup = html(<DiffViewerDemo />);

    expect(markup).toContain('data-kind="removed"');
    expect(markup).toContain('data-kind="added"');
    expect(markup).toContain("base + tax");
    expect(markup).toContain(">unified<");
    expect(markup).toContain(">split<");
    expect(markup).toContain(`${diffRows().length} rows`);
  });
});

describe("the MarkdownEditor preview", () => {
  it("reads the block forms the preview renders", () => {
    const blocks = parseMarkdown(
      "# Title\n\nA paragraph with **bold**.\n\n- one\n- two\n\n```ts\nconst a = 1;\n```",
    );

    expect(blocks.map((block) => block.kind)).toEqual([
      "heading",
      "paragraph",
      "list",
      "code",
    ]);
    expect(blocks[0]).toEqual({ kind: "heading", level: 1, text: "Title" });
  });

  it("closes an unclosed fence with the package's own rule", () => {
    const source = "Intro\n\n```ts\nconst a = 1;";
    const blocks = parseMarkdown(source);

    expect(closeFences(source)).toBe(`${source}\n\`\`\``);
    expect(blocks.at(-1)).toEqual({ kind: "code", text: "const a = 1;" });
  });

  it("draws the split, the preview blocks and the package's status line", () => {
    const markup = html(<MarkdownEditorDemo />);

    expect(markup).toContain('data-mode="split"');
    expect(markup).toContain('aria-label="Markdown editor source"');
    expect(markup).toContain("<h2");
    expect(markup).toContain("<ul>");
    expect(markup).toContain(">source<");
    expect(markup).toContain(">preview<");
    expect(markup).toContain(statsLabel(markdownStats(MARKDOWN_SAMPLE)));
  });
});

describe("the Search and replace preview", () => {
  it("counts and replaces with the package's literal scan", () => {
    const options = { caseSensitive: true, wholeWord: false };
    const matches = findRanges(FIND_SAMPLE, FIND_QUERY, options);
    const replaced = replaceAll(
      FIND_SAMPLE,
      FIND_QUERY,
      FIND_REPLACEMENT,
      options,
    );

    expect(matches.length).toBe(3);
    expect(replaced.includes(FIND_QUERY)).toBe(false);

    const first = matches[0];
    expect(first).toBeDefined();
    if (first === undefined) return;
    const one = replaceRange(
      FIND_SAMPLE,
      first.start,
      first.end,
      FIND_REPLACEMENT,
    );
    expect(one.slice(first.start).startsWith(FIND_REPLACEMENT)).toBe(true);
    expect(one.replace(FIND_REPLACEMENT, FIND_QUERY)).toBe(FIND_SAMPLE);
  });

  it("narrows a whole-word scan to the standalone matches", () => {
    // `pre` sits inside every `preview`, so the loose scan finds them and the
    // whole-word rule finds none — the rule the W toggle documents.
    const loose = findRanges(FIND_SAMPLE, "pre");
    const whole = findRanges(FIND_SAMPLE, "pre", { wholeWord: true });

    expect(loose.length).toBe(3);
    expect(whole).toEqual([]);
  });

  it("draws the readout, the toggles and the caller-owned document", () => {
    const markup = html(<SearchReplaceDemo />);

    expect(markup).toContain("1 / 3");
    expect(markup).toContain('aria-label="Match case"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain(">Replace all<");
    expect(markup).toContain('aria-label="Document"');
  });
});
