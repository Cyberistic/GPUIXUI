/**
 * CodeEditor behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a Tab or Enter that is swallowed without inserting the
 * indentation the editor promises; a read-only editor that still edits when a
 * key reaches its field; a disabled editor that does the same; the auto-indent
 * an editable Enter must keep; and a source field handed the runtime's default
 * control fill instead of the page fill the editor paints, so the caret and
 * selection are measured against a surface the reader is not looking at.
 */

import { useState, type ReactNode } from "react";
import { createTestRoot } from "@gpuix/react/testing";
import { Button } from "@gpuixui/primitives";
import { darkTheme, disabledOpacity, lightTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CodeEditor } from "../code-editor/code-editor.js";

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

/** The value the native field carries. */
const valueOf = (root: Root): string => {
  const field = root.renderer.findByTestId("code-editor");
  const value = (field?.customProps as { readonly value?: unknown } | undefined)
    ?.value;
  return typeof value === "string" ? value : "";
};

/** The test id of the element holding focus, if it names one. */
const focusedTestId = (root: Root): Option.Option<string> =>
  Option.flatMap(
    Option.fromNullishOr(root.renderer.getFocusedElementId()),
    (id) => Option.fromNullishOr(root.renderer.getElement(id)?.testId),
  );

const type = (root: Root, keys: string): void => {
  const field = root.renderer.findByTestId("code-editor");
  root.renderer.focusElement(field?.id ?? -1);
  root.renderer.nativeSimulateKeyDown(field?.id ?? -1, keys);
};

/** A controlled editor whose value the harness owns. */
const Controlled = (props: {
  readonly initial: string;
  readonly readOnly?: boolean;
  readonly disabled?: boolean;
  readonly indent?: string;
  readonly onChange?: (value: string) => void;
}) => {
  const [value, setValue] = useState(props.initial);
  return (
    <CodeEditor
      value={value}
      readOnly={props.readOnly}
      disabled={props.disabled}
      indent={props.indent}
      onValueChange={(next) => {
        props.onChange?.(next);
        setValue(next);
      }}
    />
  );
};

describe("CodeEditor", () => {
  it("inserts the indentation a Tab asks for", () => {
    const onChange = vi.fn();
    const editor = render(
      <Controlled initial="const a = 1" onChange={onChange} />,
    );
    type(editor, "tab");
    expect(onChange).toHaveBeenCalledWith("const a = 1  ");
    expect(valueOf(editor)).toBe("const a = 1  ");
    editor.unmount();
  });

  it("keeps the previous line's indentation when Enter makes a new line", () => {
    const onChange = vi.fn();
    const editor = render(
      <Controlled initial={"  const a = 1"} onChange={onChange} />,
    );
    type(editor, "enter");
    expect(onChange.mock.calls).toEqual([["  const a = 1\n  "]]);
    expect(valueOf(editor)).toBe("  const a = 1\n  ");
    editor.unmount();
  });

  it("paints a stored draft that is not text as an empty document", () => {
    // The bug guarded: a draft restored from storage as `null` reached the
    // tokenizer and the gutter, so the editor threw out of the render instead
    // of painting the empty document it documents — while the markdown editor
    // already read the same prop through `draftOf`.
    const editor = render(
      <CodeEditor defaultValue={null as unknown as string} />,
    );
    expect(valueOf(editor)).toBe("");
    type(editor, "tab");
    expect(valueOf(editor)).toBe("  ");
    editor.unmount();
  });

  it("paints the source plain when the stored language is not text", () => {
    // The bug guarded: a language restored beside the draft as a number
    // reached `@tanstack/highlight`, which reads the id through `.trim()`, so
    // the editor threw `value.trim is not a function` out of the render instead
    // of painting the plain fallback an unknown id gets.
    const editor = render(
      <CodeEditor
        defaultValue="const a = 1"
        language={42 as unknown as string}
      />,
    );
    expect(editor.renderer.getAllText()).toContain("const a = 1");
    expect(valueOf(editor)).toBe("const a = 1");
    editor.unmount();
  });

  it("names the field when the stored label is blank", () => {
    // The bug guarded: a label restored from an i18n table with a missing row
    // published `aria-label=""`, so the editor had no name in the a11y tree.
    const editor = render(<CodeEditor label="" />);
    expect(
      editor.renderer.findByTestId("code-editor")?.customProps?.["aria-label"],
    ).toBe("Code editor");
    editor.unmount();
  });

  it("does not edit when read-only, even for Tab and Enter", () => {
    const onChange = vi.fn();
    const editor = render(
      <Controlled initial="const a = 1" readOnly onChange={onChange} />,
    );
    type(editor, "tab");
    type(editor, "enter");
    expect(onChange).not.toHaveBeenCalled();
    expect(valueOf(editor)).toBe("const a = 1");
    editor.unmount();
  });

  it("does not edit when disabled, even for Tab and Enter", () => {
    const onChange = vi.fn();
    const editor = render(
      <Controlled initial="const a = 1" disabled onChange={onChange} />,
    );
    type(editor, "tab");
    type(editor, "enter");
    expect(onChange).not.toHaveBeenCalled();
    expect(valueOf(editor)).toBe("const a = 1");
    editor.unmount();
  });

  it("leaves the tab order and paints the disabled chrome", () => {
    // The bug this guards: `disabled` documented "painted with the disabled
    // chrome" and dropped the tab stop, but the surface painted the same as a
    // live editor — a reader typed into a field that refused every key with
    // nothing saying why. The `opacity` is the share the library's other
    // disabled surfaces paint (`@gpuixui/tokens`' `disabledOpacity`).
    const editor = render(
      <div>
        <Button testId="before">Before</Button>
        <CodeEditor defaultValue="const a = 1" disabled />
        <Button testId="after">After</Button>
      </div>,
    );
    expect(
      editor.renderer.findByTestId("code-editor")?.customProps,
    ).toMatchObject({ tabIndex: -1 });
    expect(
      editor.renderer.findByTestId("code-editor-surface")?.style.opacity,
    ).toBe(disabledOpacity);

    editor.renderer.focusElement(
      editor.renderer.findByTestId("before")?.id ?? -1,
    );
    editor.renderer.simulateKeystrokes("tab");
    expect(focusedTestId(editor)).toEqual(Option.some("after"));

    editor.unmount();
  });

  it("paints no disabled chrome while it can edit", () => {
    const editor = render(<CodeEditor defaultValue="const a = 1" />);
    expect(
      editor.renderer.findByTestId("code-editor-surface")?.style.opacity,
    ).toBeUndefined();
    editor.unmount();
  });

  it("keeps Tab as the traversal when the indent inserts nothing", () => {
    // The bug guarded: `tabMode` still swallowed Tab with `indent=""`, so the
    // field was a keyboard trap — every Tab inserted "" and none moved focus.
    const editor = render(
      <div>
        <Button testId="before">Before</Button>
        <CodeEditor defaultValue="const a = 1" testId="code-editor" indent="" />
        <Button testId="after">After</Button>
      </div>,
    );
    editor.renderer.focusElement(
      editor.renderer.findByTestId("before")?.id ?? -1,
    );
    editor.renderer.simulateKeystrokes("tab");
    expect(focusedTestId(editor)).toEqual(Option.some("code-editor"));
    editor.renderer.simulateKeystrokes("tab");
    expect(focusedTestId(editor)).toEqual(Option.some("after"));
    expect(valueOf(editor)).toBe("const a = 1");
    editor.unmount();
  });

  it("reads an indent it cannot store as the default", () => {
    // The bug guarded: a preference restored as `null` reached
    // `value + indent`, so Tab typed the word "null" into the document.
    const onChange = vi.fn();
    const editor = render(
      <Controlled
        initial="const a = 1"
        indent={null as unknown as string}
        onChange={onChange}
      />,
    );
    type(editor, "tab");
    expect(onChange).toHaveBeenCalledWith("const a = 1  ");
    expect(valueOf(editor)).toBe("const a = 1  ");
    editor.unmount();
  });

  it("lines a gutter number up with the code line it numbers", () => {
    // The bug guarded: the gutter column was padded by one spacing step, so
    // every number painted below the line it numbers — measured in the
    // renderer as `alpha` at y=1 with its `1` at y=9 and `beta` at y=19 with
    // its `2` at y=27 — on a surface whose whole job is to lay code out in
    // numbered rows.
    const editor = render(<CodeEditor defaultValue={"alpha\nbeta"} />);
    const boundsOf = (text: string) => {
      const element = editor.renderer.findByText(text);
      return element === undefined
        ? undefined
        : editor.renderer.getElementBounds(element.id);
    };
    const firstLine = boundsOf("alpha");
    const secondLine = boundsOf("beta");
    const firstNumber = boundsOf("1");
    const secondNumber = boundsOf("2");
    expect(firstNumber?.y).toBe(firstLine?.y);
    expect(secondNumber?.y).toBe(secondLine?.y);
    expect(firstNumber?.height).toBe(firstLine?.height);
    editor.unmount();
  });

  it("paints the line an empty document shows", () => {
    // The bug guarded: the highlight layer is the editor's box (the field is
    // absolutely positioned over it), and it painted one row per line *ending*,
    // so an empty document was its two borders — 2 points tall, with no line
    // number, no room for its hint and no caret line to type on.
    const heightOf = (node: ReactNode): number | undefined => {
      const editor = render(node);
      const surface = editor.renderer.findByTestId("code-editor-surface");
      const height = editor.renderer.getElementBounds(
        surface?.id ?? -1,
      )?.height;
      editor.unmount();
      return height;
    };
    const empty = heightOf(
      <CodeEditor value="" onValueChange={() => undefined} />,
    );
    const oneLine = heightOf(
      <CodeEditor value="a" onValueChange={() => undefined} />,
    );
    expect(empty).toBe(oneLine);
    expect(empty).toBeGreaterThan(2);

    const editor = render(
      <CodeEditor value="" onValueChange={() => undefined} />,
    );
    expect(editor.renderer.getAllText()).toContain("1");
    editor.unmount();
  });

  it("keeps the caret's line inside the box a trailing newline leaves", () => {
    // The bug guarded: after Enter the field holds an empty final line, and the
    // layer stopped at the last line *with text*, so the caret's line painted
    // outside a box that ended on the newline (`"a\n"` measured one row tall).
    const heightOf = (value: string): number | undefined => {
      const editor = render(
        <CodeEditor value={value} onValueChange={() => undefined} />,
      );
      const surface = editor.renderer.findByTestId("code-editor-surface");
      const height = editor.renderer.getElementBounds(
        surface?.id ?? -1,
      )?.height;
      editor.unmount();
      return height;
    };
    expect(heightOf("a\n")).toBe(heightOf("a\nb"));

    const editor = render(
      <CodeEditor value={"a\n"} onValueChange={() => undefined} />,
    );
    expect(editor.renderer.getAllText()).toContain("2");
    editor.unmount();
  });

  it("paints the rows the caller asks for with minRows", () => {
    // The bug guarded: `minRows` documented "minimum visible rows" and reached
    // the absolutely positioned field, so it could not size anything — three
    // asked-for rows measured the empty editor's two borders.
    const heightOf = (node: ReactNode): number | undefined => {
      const editor = render(node);
      const surface = editor.renderer.findByTestId("code-editor-surface");
      const height = editor.renderer.getElementBounds(
        surface?.id ?? -1,
      )?.height;
      editor.unmount();
      return height;
    };
    expect(
      heightOf(
        <CodeEditor value="" minRows={3} onValueChange={() => undefined} />,
      ),
    ).toBe(
      heightOf(
        <CodeEditor value={"a\nb\nc"} onValueChange={() => undefined} />,
      ),
    );
  });

  it("hands the source field the page fill the editor paints", () => {
    Arr.forEach([lightTheme, darkTheme], (theme) => {
      const editor = render(<CodeEditor defaultValue="const a = 1" />, theme);
      const host = editor.renderer.findByTestId("code-editor");
      // The editor paints `bg-background` and lays a transparent field over it,
      // so the runtime must measure the caret and selection on that fill rather
      // than on a plain control's `input` role.
      expect(host?.customProps?.theme).toMatchObject({
        appearance: theme.mode,
        bg: theme.colors.background,
        caret: theme.colors.primary,
        fontMono: theme.typography.mono,
      });
      // The seam is a host prop, not a style: `appearance` in a style is ignored.
      expect(host?.style.appearance).toBeUndefined();
      editor.unmount();
    });
  });
});
