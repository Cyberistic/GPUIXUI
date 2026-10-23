/**
 * The editor's painted field hints, in the real GPUix renderer.
 *
 * The bug these guard: the runtime shapes a `<textarea>`'s placeholder in a
 * fixed `#8F8F8F` (`custom_elements/input.rs` at the pinned
 * `@gpuix/native@0.11.0`), which measures 2.84:1 on a white field — so the
 * markdown source and the code editor painted a hint no theme could reach. Both
 * now hand the host no placeholder and paint the hint through
 * `@gpuixui/primitives/hint`, the same seam the primitives' fields use, and
 * announce the words on the help channel the host loses with its `aria-placeholder`.
 */

import type { ReactNode } from "react";
import { createTestRoot } from "@gpuix/react/testing";
import { darkTheme, disabledOpacity, lightTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { afterEach, describe, expect, it } from "vitest";
import { CodeEditor } from "../code-editor/code-editor.js";
import { MarkdownEditor } from "../markdown/markdown-editor.js";

interface Root {
  readonly renderer: ReturnType<typeof createTestRoot>["renderer"];
  readonly unmount: () => void;
}

let current: Root | undefined;

const render = (node: ReactNode, theme = darkTheme): Root => {
  const root = createTestRoot({ width: 1000, height: 700 });
  root.render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);
  const mounted: Root = {
    renderer: root.renderer,
    unmount: () => {
      root.unmount();
      current = undefined;
    },
  };
  current = mounted;
  return mounted;
};

afterEach(() => {
  current?.unmount();
});

/** The colour the hint paints, or a failure naming the missing id. */
const hintColour = (root: Root, hintId: string): unknown => {
  const hint = root.renderer.findByTestId(hintId);
  if (hint === undefined) expect.fail(`no hint painted as ${hintId}`);
  return hint.style.color;
};

/** Every help sentence the last painted frame publishes. */
const descriptions = (root: Root): ReadonlyArray<string> => {
  const nodes = root.renderer.getA11yTree().nodes ?? {};
  return Object.values(nodes).flatMap((node) =>
    node.aria?.description === undefined ? [] : [node.aria.description],
  );
};

/** A markdown editor with a hint and no text yet. */
const Markdown = (props: { readonly disabled?: boolean }) => (
  <MarkdownEditor
    defaultValue=""
    placeholder="Write the notes"
    disabled={props.disabled}
    testId="editor"
  />
);

/** A code editor with a hint and no text yet. */
const Code = (props: { readonly disabled?: boolean }) => (
  <CodeEditor
    defaultValue=""
    placeholder="Paste the source"
    disabled={props.disabled}
    testId="code-editor"
  />
);

describe("the editor's painted field hint", () => {
  it("hands the host no placeholder and paints the measured role", () => {
    const markdown = render(<Markdown />);
    expect(
      markdown.renderer.findByTestId("markdown-source")?.customProps
        ?.placeholder,
    ).toBeUndefined();
    expect(hintColour(markdown, "markdown-source-hint")).toBe(
      darkTheme.colors.placeholder,
    );
    expect(markdown.renderer.getAllText()).toContain("Write the notes");
    expect(descriptions(markdown)).toContain("Write the notes");
    markdown.unmount();

    const code = render(<Code />);
    expect(
      code.renderer.findByTestId("code-editor")?.customProps?.placeholder,
    ).toBeUndefined();
    expect(hintColour(code, "code-editor-hint")).toBe(
      darkTheme.colors.placeholder,
    );
    expect(code.renderer.getAllText()).toContain("Paste the source");
    expect(descriptions(code)).toContain("Paste the source");
    code.unmount();
  });

  it("paints the light theme's role rather than the runtime's grey", () => {
    const editor = render(<Markdown />, lightTheme);
    expect(hintColour(editor, "markdown-source-hint")).toBe(
      lightTheme.colors.placeholder,
    );
    expect(hintColour(editor, "markdown-source-hint")).not.toBe("#8F8F8F");
    editor.unmount();
  });

  it("hides the hint once the reader types, and brings it back when the field clears", () => {
    const editor = render(<Markdown />);
    editor.renderer.focusElement(
      editor.renderer.findByTestId("markdown-source")?.id ?? -1,
    );
    editor.renderer.simulateKeystrokes("a");
    expect(
      editor.renderer.findByTestId("markdown-source-hint"),
    ).toBeUndefined();

    editor.renderer.simulateKeystrokes("backspace");
    expect(editor.renderer.findByTestId("markdown-source-hint")).toBeDefined();
    editor.unmount();
  });

  it("fades a disabled hint with the field it sits in", () => {
    const editor = render(<Code disabled />);
    const hint = editor.renderer.findByTestId("code-editor-hint");
    expect(hint?.style.color).toBe(darkTheme.colors.placeholder);
    expect(hint?.style.opacity).toBe(disabledOpacity);
    editor.unmount();
  });
});
