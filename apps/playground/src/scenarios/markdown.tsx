/**
 * `markdown-surface` — the Tier 5 rich-text feasibility probe.
 *
 * `<markdown>` is a published host element that parses GitHub-flavoured
 * markdown, renders it natively and registers every block in the shared
 * selection registry. Nothing had mounted one, so "its text is selectable" and
 * "links work" were assumptions. This measures four things:
 *
 * 1. render — headings, prose, lists, tables and fenced code paint as real text;
 * 2. links — `onLinkClick` fires for a coordinate click aimed at the link glyphs;
 * 3. selection — a drag can cross the markdown boundary and copy its text;
 * 4. composition — React children stay out of the paint, and the container
 *    carries the authored accessibility role.
 *
 * The container is `w_full`, so the fixture keeps the link in a one-line
 * document starting at the element's left edge; a click at the element centre
 * then lands on the link. That is a fixture constraint, not an API contract.
 *
 * Measured facts: plan `181` §8.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { fieldText, nodeFor } from "../a11y.js";
import { Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

const LINK_URL = "https://example.test/docs";

const DOC = [
  "# Release notes",
  "",
  "A **bold** claim, an *emphasis* and a `code` span.",
  "",
  "- first item",
  "- second item",
  "",
  "| Metric | Value |",
  "| ------ | ----- |",
  "| Rows   | 500   |",
  "| Paint  | 9     |",
  "",
  "```ts",
  "const total = rows * 2;",
  "```",
].join("\n");

const LINK_DOC = `[Open the documentation site for the whole project](${LINK_URL})`;

const MarkdownProbe = () => {
  const theme = useTheme();
  const [url, setUrl] = useState("url=none");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 560,
        padding: 8,
        backgroundColor: theme.colors.background,
      }}
    >
      <Readout testId="md-link">{url}</Readout>
      <text testId="md-before" style={{ color: theme.colors.foreground }}>
        before
      </text>
      <markdown
        testId="md-doc"
        role="article"
        aria-id="md-doc"
        aria-label="Release notes"
        source={DOC}
      />
      <text testId="md-after" style={{ color: theme.colors.foreground }}>
        after
      </text>
      <markdown
        testId="md-link-doc"
        source={LINK_DOC}
        onLinkClick={(event) => setUrl(`url=${event.value ?? "none"}`)}
      />
      <markdown testId="md-child" source="# Child">
        <text testId="md-child-text">md-child-text</text>
      </markdown>
    </div>
  );
};

const painted = (ctx: Smoke.SmokeContext, needle: string): boolean =>
  Arr.some(ctx.host.paintedText(), (entry) => Str.includes(needle)(entry));

const readout = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(testId)), () => "");

export const markdownScenario: PlaygroundScenario = {
  id: "markdown-surface",
  title: "Markdown: blocks render, links click, text selects, children ignored",
  capability: "content",
  view: () => <MarkdownProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectEqual(
        "the document is a markdown host element",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.elementType("md-doc")),
          () => "none",
        ),
        "markdown",
      );
      const doc = yield* ctx.expectSome(
        "the document is painted",
        Option.fromNullishOr(ctx.host.bounds("md-doc")),
      );
      yield* ctx.expectNear(
        "the document fills its container width",
        doc.width,
        560 - 16,
        0.5,
      );
      yield* ctx.expectEqual(
        "the document has a painted height",
        doc.height > 0,
        true,
      );

      yield* ctx.expectEqual(
        "a heading paints",
        painted(ctx, "Release notes"),
        true,
      );
      yield* ctx.expectEqual(
        "a list item paints",
        painted(ctx, "first item"),
        true,
      );
      yield* ctx.expectEqual(
        "a table header paints",
        painted(ctx, "Metric"),
        true,
      );
      yield* ctx.expectEqual("a table cell paints", painted(ctx, "500"), true);
      yield* ctx.expectEqual(
        "a fenced code line paints",
        painted(ctx, "const total = rows * 2;"),
        true,
      );

      const selection = yield* ctx.expectSome(
        "a drag across the document selects text",
        Option.fromNullishOr(ctx.host.selectText("md-before", "md-after")),
      );
      yield* ctx.expectContains(
        "the selection crosses the markdown boundary",
        selection,
        "Release notes",
      );
      yield* ctx.expectContains(
        "the selection reaches the fenced code",
        selection,
        "const total",
      );

      ctx.host.click("md-link-doc");
      yield* ctx.expectEqual(
        "a coordinate click on the link fires onLinkClick",
        readout(ctx, "md-link"),
        `url=${LINK_URL}`,
      );

      ctx.host.click("md-doc");
      yield* ctx.expectEqual(
        "prose without a link fires no link event",
        readout(ctx, "md-link"),
        `url=${LINK_URL}`,
      );

      yield* ctx.expectEqual(
        "the markdown source still paints its own content",
        painted(ctx, "Child"),
        true,
      );
      yield* ctx.expectContains(
        "React children stay in the retained tree",
        readout(ctx, "md-child"),
        "md-child-text",
      );
      yield* ctx.expectEqual(
        "React children are dropped from the paint",
        painted(ctx, "md-child-text"),
        false,
      );

      const tree = yield* ctx.expectSome(
        "the runtime painted an accessibility tree",
        Option.fromNullishOr(ctx.host.a11y()),
      );
      const node = yield* ctx.expectSome(
        "the document is a named accessibility node",
        nodeFor(tree, "md-doc"),
      );
      yield* ctx.expectEqual(
        "the document reports the article role",
        fieldText(node.role),
        "Article",
      );
      yield* ctx.expectEqual(
        "the document carries its accessible name",
        fieldText(node.label),
        "Release notes",
      );
    }),
};
