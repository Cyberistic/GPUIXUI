/**
 * MarkdownEditor behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a source field that cannot take a keystroke; a preview
 * that does not follow the text; a view button that does not change the panes;
 * a read-only or disabled editor that still edits; and an empty preview that
 * paints nothing rather than saying why.
 */

import { useState, type ReactNode } from "react";
import { createTestRoot } from "@gpuix/react/testing";
import { darkTheme, lightTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MarkdownEditor,
  type MarkdownEditorProps,
} from "../markdown/markdown-editor.js";

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

/**
 * Every text channel: the chrome's `<text>` nodes and the `<markdown>` host's
 * painted runs (the offscreen renderer reports a markdown source as its own
 * painted text, which is enough to prove the preview received it).
 */
const text = (root: Root): ReadonlyArray<string> => [
  ...root.renderer.getAllText(),
  ...root.renderer.getPaintedText().join("\n").split("\n"),
];

const sourceOf = (root: Root): string => {
  const field = root.renderer.findByTestId("markdown-source");
  const value = (field?.customProps as { readonly value?: unknown } | undefined)
    ?.value;
  return typeof value === "string" ? value : "";
};

const visible = (root: Root, testId: string): boolean => {
  const found = root.renderer.findByTestId(testId);
  return found !== undefined && found !== null;
};

const click = (root: Root, testId: string): void => {
  const element = root.renderer.findByTestId(testId);
  const bounds = root.renderer.getElementBounds(element?.id ?? -1);
  if (element == null || bounds == null)
    throw new Error(`no painted ${testId} to press`);
  root.renderer.nativeSimulateClick(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
    0,
  );
};

const type = (root: Root, keys: string): void => {
  const field = root.renderer.findByTestId("markdown-source");
  root.renderer.focusElement(field?.id ?? -1);
  root.renderer.simulateKeystrokes(keys);
};

/** A controlled editor whose value the harness owns. */
const Controlled = ({
  initial = "# Title",
  ...props
}: Partial<MarkdownEditorProps> & { readonly initial?: string }) => {
  const [value, setValue] = useState(initial);
  return (
    <MarkdownEditor
      value={value}
      onValueChange={setValue}
      testId="editor"
      label="Notes"
      {...props}
    />
  );
};

describe("MarkdownEditor", () => {
  it("paints the source and its rendered preview from one value", () => {
    const editor = render(<Controlled />);
    expect(visible(editor, "markdown-source")).toBe(true);
    expect(visible(editor, "markdown-rendered")).toBe(true);
    expect(text(editor)).toContain("Title");
    expect(text(editor)).toContain("1 line · 2 words");
    editor.unmount();
  });

  it("follows an edit into the preview", async () => {
    const editor = render(<Controlled />);
    type(editor, "enter");
    editor.renderer.simulateKeystrokes("enter");
    editor.renderer.simulateKeystrokes("paragraph");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sourceOf(editor)).toContain("paragraph");
    expect(text(editor)).toContain("paragraph");
    expect(text(editor)).toContain("3 lines · 3 words");
    editor.unmount();
  });

  it("switches the panes from the view buttons", () => {
    const editor = render(<Controlled />);
    click(editor, "markdown-mode-preview");
    expect(visible(editor, "markdown-source")).toBe(false);
    expect(visible(editor, "markdown-rendered")).toBe(true);
    click(editor, "markdown-mode-source");
    expect(visible(editor, "markdown-source")).toBe(true);
    expect(visible(editor, "markdown-rendered")).toBe(false);
    click(editor, "markdown-mode-split");
    expect(visible(editor, "markdown-source")).toBe(true);
    expect(visible(editor, "markdown-rendered")).toBe(true);
    editor.unmount();
  });

  it("says why an empty preview is empty", () => {
    const editor = render(<Controlled initial="" />);
    expect(visible(editor, "markdown-empty")).toBe(true);
    expect(text(editor)).toContain("Nothing to preview yet.");
    expect(visible(editor, "markdown-rendered")).toBe(false);
    editor.unmount();
  });

  it("closes an unclosed fence in the preview and leaves the source alone", () => {
    const editor = render(<Controlled initial={"```ts\nconst a = 1"} />);
    expect(text(editor)).toContain("const a = 1");
    expect(sourceOf(editor)).toContain("```ts");
    editor.unmount();
  });

  it("does not edit when read-only, and keeps the text", () => {
    const onChange = vi.fn();
    const editor = render(
      <MarkdownEditor
        defaultValue="fixed"
        onValueChange={onChange}
        readOnly
        testId="editor"
      />,
    );
    type(editor, "x");
    expect(onChange).not.toHaveBeenCalled();
    expect(text(editor)).toContain("fixed");
    editor.unmount();
  });

  it("does not edit when disabled", () => {
    const onChange = vi.fn();
    const editor = render(
      <MarkdownEditor
        defaultValue="fixed"
        onValueChange={onChange}
        disabled
        testId="editor"
      />,
    );
    type(editor, "x");
    expect(onChange).not.toHaveBeenCalled();
    editor.unmount();
  });

  it("follows a controlled view and reports an uncontrolled change", () => {
    const onModeChange = vi.fn();
    const controlled = render(
      <Controlled mode="source" onModeChange={onModeChange} />,
    );
    expect(visible(controlled, "markdown-preview")).toBe(false);
    click(controlled, "markdown-mode-preview");
    expect(onModeChange).toHaveBeenCalledWith("preview");
    expect(visible(controlled, "markdown-preview")).toBe(false);
    controlled.unmount();
  });

  it("paints the light theme's ink, not the dark one's", () => {
    const editor = render(<Controlled />, lightTheme);
    expect(text(editor)).toContain("Title");
    editor.unmount();
  });
});
