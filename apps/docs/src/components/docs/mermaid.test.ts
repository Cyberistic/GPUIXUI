import { readFileSync } from "node:fs";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { renderMermaid } from "./mermaid";
import { mermaidFence } from "../../lib/remark-mermaid";

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

const rule = (selector: string): string => {
  const start = css.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`no ${selector} block`);
  return css.slice(start, css.indexOf("}", start));
};

const render = (source: string) =>
  Effect.runSync(
    Effect.match(renderMermaid(source), {
      onFailure: (error) => ({ ok: false as const, message: error.message }),
      onSuccess: (svg) => ({ ok: true as const, svg }),
    }),
  );

describe("Pele's render", () => {
  it("renders a flowchart's labels into the SVG", () => {
    const result = render("flowchart LR\n  A[Ingest] --> B[Frame]");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.svg).toContain("<svg");
    expect(result.svg).toContain("Ingest");
    expect(result.svg).toContain("Frame");

    expect(result.svg).toContain('class="pele');
  });

  it("is deterministic, so the prerendered markup and the client agree", () => {
    const source = "flowchart TD\n  A[One] --> B[Two]";

    const first = render(source);
    const second = render(source);
    expect(first.ok && second.ok ? first.svg : "").toBe(
      second.ok ? second.svg : "",
    );
  });

  it("fails with a typed error when the source does not parse", () => {
    const result = render("this is not a diagram");

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.message.length).toBeGreaterThan(0);
    expect(result.message).toContain("diagram");
  });
});

describe("the fence rewrite", () => {
  const tree = () => ({
    type: "root",
    children: [
      { type: "paragraph", children: [{ type: "text", value: "Prose." }] },
      {
        type: "code",
        lang: "mermaid",
        value: "flowchart LR\n  A --> B",
      },
      { type: "code", lang: "ts", value: "const a = 1;" },
    ],
  });

  it("turns a mermaid fence into the diagram, and leaves other fences alone", () => {
    const root = tree();
    mermaidFence()(root);

    const [paragraph, mermaid, typescript] = root.children as ReadonlyArray<{
      type: string;
      name?: string;
      lang?: string;
      attributes?: ReadonlyArray<{ name: string; value: unknown }>;
    }>;

    expect(paragraph?.type).toBe("paragraph");
    expect(mermaid?.type).toBe("mdxJsxFlowElement");
    expect(mermaid?.name).toBe("MermaidDiagram");
    expect(
      mermaid?.attributes?.find((attribute) => attribute.name === "source")
        ?.value,
    ).toBe("flowchart LR\n  A --> B");

    expect(typescript?.type).toBe("code");
    expect(typescript?.lang).toBe("ts");
  });

  it("reads the fence value without a trailing blank line", () => {
    const root = {
      type: "root",
      children: [{ type: "code", lang: "mermaid", value: "graph TD\n  A\n\n" }],
    };
    mermaidFence()(root);

    const [node] = root.children as ReadonlyArray<{
      attributes?: ReadonlyArray<{ name: string; value: unknown }>;
    }>;
    expect(
      node?.attributes?.find((attribute) => attribute.name === "source")?.value,
    ).toBe("graph TD\n  A");
  });
});

describe("the theme mapping", () => {
  it("maps every Pele role to the page's own, as a var(), not a literal", () => {
    const figure = rule(".gx-mermaid");

    for (const [role, source] of [
      ["--pele-bg", "--card"],
      ["--pele-fg", "--foreground"],
      ["--pele-muted", "--muted-foreground"],
      ["--pele-surface", "--muted"],
      ["--pele-border", "--border"],
      ["--pele-accent", "--ring"],
    ] as const) {
      expect(figure).toContain(`${role}: var(${source})`);
    }
  });

  it("never names a colour literal", () => {
    const figure = rule(".gx-mermaid");

    expect(figure).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(figure).not.toMatch(/\brgba?\(/);
  });
});
