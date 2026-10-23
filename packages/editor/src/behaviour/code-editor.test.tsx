/**
 * CodeEditor behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a Tab or Enter that is swallowed without inserting the
 * indentation the editor promises; a read-only editor that still edits when a
 * key reaches its field; a disabled editor that does the same; and the
 * auto-indent an editable Enter must keep.
 */

import { useState, type ReactNode } from "react";
import { createTestRoot } from "@gpuix/react/testing";
import { darkTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CodeEditor } from "../code-editor/code-editor.js";

interface Root {
  readonly renderer: ReturnType<typeof createTestRoot>["renderer"];
  readonly unmount: () => void;
}

let current: Root | undefined;

const render = (node: ReactNode): Root => {
  const root = createTestRoot({ width: 1000, height: 700 });
  root.render(<ThemeProvider theme={darkTheme}>{node}</ThemeProvider>);
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
});
