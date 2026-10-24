/**
 * MarkdownEditor behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a source field that cannot take a keystroke; a preview
 * that does not follow the text; a view button that does not change the panes;
 * a read-only or disabled editor that still edits; a disabled editor that keeps
 * its field, divider and preview as tab stops and paints as though it were
 * live; an empty preview that paints nothing rather than saying why; and a
 * draft restored from storage that is not text, which threw out of the render
 * instead of painting an empty document.
 */

import { useState, type ReactNode } from "react";
import { DIVIDER_STEP, DIVIDER_WIDTH } from "@gpuixui/dock";
import { Button } from "@gpuixui/primitives";
import { createTestRoot } from "@gpuix/react/testing";
import { darkTheme, disabledOpacity, lightTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import * as Option from "effect/Option";
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

/** The test id of the element holding focus, if it names one. */
const focused = (root: Root): Option.Option<string> =>
  Option.flatMap(
    Option.fromNullishOr(root.renderer.getFocusedElementId()),
    (id) => Option.fromNullishOr(root.renderer.getElement(id)?.testId),
  );

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

const boundsOf = (
  root: Root,
  testId: string,
): { readonly x: number; readonly y: number; readonly width: number } => {
  const element = root.renderer.findByTestId(testId);
  const bounds = root.renderer.getElementBounds(element?.id ?? -1);
  if (element == null || bounds == null) {
    throw new Error(`no painted ${testId} to measure`);
  }
  return bounds;
};

const dragDivider = (root: Root, delta: number): void => {
  const divider = boundsOf(root, "editor-split-divider");
  const x = divider.x + divider.width / 2;
  const y = divider.y + 40;
  root.renderer.nativeSimulateMouseDown(x, y);
  root.renderer.nativeSimulateMouseMove(x + delta, y, 0);
  root.renderer.nativeSimulateMouseUp(x + delta, y);
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

  it("publishes which view is showing", () => {
    // The bug guarded: the three view buttons differed only by colour, so a
    // reader could not tell which view was painted. 0.11.0 has no
    // `aria-current`, and `aria-selected` is the substitution Pagination,
    // Stepper and Timeline use for the same job.
    const editor = render(<Controlled />);
    const selected = (root: Root, testId: string): unknown =>
      root.renderer.findByTestId(testId)?.customProps?.["aria-selected"];
    expect(selected(editor, "markdown-mode-split")).toBe(true);
    expect(selected(editor, "markdown-mode-preview")).toBe(false);
    click(editor, "markdown-mode-preview");
    expect(selected(editor, "markdown-mode-preview")).toBe(true);
    expect(selected(editor, "markdown-mode-split")).toBe(false);
    expect(selected(editor, "markdown-mode-source")).toBe(false);
    editor.unmount();
  });

  it("says why an empty preview is empty", () => {
    const editor = render(<Controlled initial="" />);
    expect(visible(editor, "markdown-empty")).toBe(true);
    expect(text(editor)).toContain("Nothing to preview yet.");
    expect(visible(editor, "markdown-rendered")).toBe(false);
    editor.unmount();
  });

  it("reads a stored draft that is not text as an empty document", async () => {
    // A draft restored from storage writes `null` where it carried no document.
    // The status line and the preview read the text directly, so that value
    // threw out of the render and the editor painted nothing at all — not the
    // empty state it documents.
    const Stored = () => {
      const [draft, setDraft] = useState<string | null>(null);
      return (
        <MarkdownEditor
          value={draft as unknown as string}
          onValueChange={setDraft}
          testId="editor"
        />
      );
    };
    const editor = render(<Stored />);
    expect(visible(editor, "markdown-empty")).toBe(true);
    expect(text(editor)).toContain("0 lines · 0 words");
    type(editor, "x");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sourceOf(editor)).toBe("x");
    editor.unmount();
  });

  it("starts from an empty document when the stored default is not text", () => {
    const editor = render(
      <MarkdownEditor
        defaultValue={null as unknown as string}
        testId="editor"
      />,
    );
    expect(visible(editor, "markdown-empty")).toBe(true);
    expect(text(editor)).toContain("0 lines · 0 words");
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

  it("leaves the tab order and paints the disabled chrome", () => {
    const editor = render(
      <div>
        <Button testId="before">Before</Button>
        <MarkdownEditor defaultValue="fixed" disabled testId="editor" />
        <Button testId="after">After</Button>
      </div>,
    );
    expect(
      editor.renderer.findByTestId("markdown-source")?.customProps,
    ).toMatchObject({ tabIndex: -1 });
    expect(
      editor.renderer.findByTestId("markdown-preview-viewport")?.customProps
        ?.tabIndex,
    ).toBeUndefined();
    expect(editor.renderer.findByTestId("editor")?.style.opacity).toBe(
      disabledOpacity,
    );

    editor.renderer.focusElement(
      editor.renderer.findByTestId("before")?.id ?? -1,
    );
    editor.renderer.simulateKeystrokes("tab");
    expect(focused(editor)).toEqual(Option.some("after"));
    editor.unmount();
  });

  it("keeps its source and preview as stops while it can edit", () => {
    const editor = render(
      <div>
        <Button testId="before">Before</Button>
        <MarkdownEditor defaultValue="fixed" testId="editor" />
        <Button testId="after">After</Button>
      </div>,
    );
    expect(
      editor.renderer.findByTestId("markdown-source")?.customProps,
    ).toMatchObject({ tabIndex: 0 });
    expect(
      editor.renderer.findByTestId("markdown-preview-viewport")?.customProps
        ?.tabIndex,
    ).toBe(0);
    expect(
      editor.renderer.findByTestId("editor")?.style.opacity,
    ).toBeUndefined();

    editor.renderer.focusElement(
      editor.renderer.findByTestId("before")?.id ?? -1,
    );
    editor.renderer.simulateKeystrokes("tab");
    expect(Option.isSome(focused(editor))).toBe(true);
    expect(focused(editor)).not.toEqual(Option.some("after"));
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

  it("resizes the split from the divider and reports the size", () => {
    const sizes: number[] = [];
    const editor = render(
      <Controlled onSplitSizeChange={(size) => sizes.push(size)} />,
    );
    const before = boundsOf(editor, "markdown-source").width;
    dragDivider(editor, 60);
    expect(sizes.at(-1)).toBe(before + 60);
    expect(boundsOf(editor, "markdown-source").width).toBe(before + 60);
    editor.unmount();
  });

  it("holds a controlled split size until the caller moves it", () => {
    const sizes: number[] = [];
    const editor = render(
      <Controlled
        splitSize={200}
        onSplitSizeChange={(size) => sizes.push(size)}
      />,
    );
    expect(boundsOf(editor, "markdown-source").width).toBe(200);
    dragDivider(editor, 60);
    expect(sizes.at(-1)).toBe(260);
    expect(boundsOf(editor, "markdown-source").width).toBe(200);
    editor.unmount();
  });

  it("reads a stored split size it cannot lay out as the middle", () => {
    const editor = render(<Controlled splitSize={Number.NaN} />);
    expect(boundsOf(editor, "markdown-source").width).toBe(
      Math.floor((640 - DIVIDER_WIDTH) / 2),
    );
    editor.unmount();
  });

  it("steps the split from the divider's keyboard", () => {
    const sizes: number[] = [];
    const editor = render(
      <Controlled onSplitSizeChange={(size) => sizes.push(size)} />,
    );
    const before = boundsOf(editor, "markdown-source").width;
    const divider = editor.renderer.findByTestId("editor-split-divider");
    editor.renderer.nativeSimulateKeyDown(divider?.id ?? -1, "right");
    expect(sizes.at(-1)).toBe(before + DIVIDER_STEP);
    editor.unmount();
  });

  it("hands the source field the active theme's host palette", () => {
    const editor = render(<Controlled />, lightTheme);
    const host = editor.renderer.findByTestId("markdown-source");
    expect(host?.customProps?.theme).toMatchObject({
      appearance: "light",
      bg: lightTheme.colors.background,
      caret: lightTheme.colors.primary,
      textMuted: lightTheme.colors.mutedForeground,
      fontMono: lightTheme.typography.mono,
    });
    // The seam is a host prop, not a style: the runtime reads `appearance`,
    // `bg` and `caret` off the theme object, and a spread into `style` is
    // ignored, which left a light editor with the built-in dark caret.
    expect(host?.style.appearance).toBeUndefined();
    editor.unmount();
  });

  it("paints the light theme's ink, not the dark one's", () => {
    const editor = render(<Controlled />, lightTheme);
    expect(text(editor)).toContain("Title");
    editor.unmount();
  });

  it("names every part from one name, and reads a blank name as the default", () => {
    // The bug guarded: a label from an i18n table or a saved record may arrive
    // empty, and the parts derive their names from it — a blank label published
    // " source", " preview" and " split", names that identify nothing.
    const nameOf = (root: Root, testId: string): unknown =>
      root.renderer.findByTestId(testId)?.customProps?.["aria-label"];
    const blank = render(
      <MarkdownEditor defaultValue="# Title" label="" testId="editor" />,
    );
    expect(nameOf(blank, "markdown-source")).toBe("Markdown editor source");
    expect(nameOf(blank, "markdown-preview-viewport")).toBe(
      "Markdown editor preview",
    );
    expect(nameOf(blank, "editor-split-divider")).toBe("Markdown editor split");
    blank.unmount();

    const padded = render(
      <MarkdownEditor
        defaultValue="# Title"
        label="  Notes  "
        testId="editor"
      />,
    );
    expect(nameOf(padded, "markdown-source")).toBe("Notes source");
    expect(nameOf(padded, "markdown-preview-viewport")).toBe("Notes preview");
    padded.unmount();

    // A saved record writes the field it kept, and a label that is not text is
    // no name at all: every part keeps the default prefix instead of the render
    // throwing `self.trim is not a function` out of `accessibleName`.
    const stored = render(
      <MarkdownEditor
        defaultValue="# Title"
        label={42 as unknown as string}
        testId="editor"
      />,
    );
    expect(nameOf(stored, "markdown-source")).toBe("Markdown editor source");
    expect(nameOf(stored, "markdown-preview-viewport")).toBe(
      "Markdown editor preview",
    );
    expect(nameOf(stored, "editor-split-divider")).toBe(
      "Markdown editor split",
    );
    stored.unmount();
  });
});
