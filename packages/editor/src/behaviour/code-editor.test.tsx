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
import { darkTheme, lightTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
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
  readonly onChange?: (value: string) => void;
}) => {
  const [value, setValue] = useState(props.initial);
  return (
    <CodeEditor
      value={value}
      readOnly={props.readOnly}
      disabled={props.disabled}
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
