/**
 * Copy that arrived blank, measured in a real renderer.
 *
 * The bug guarded: `ImagePreview`'s caption and `DropZone`'s description were
 * painted whenever they were not `undefined`, and a caption an i18n table or a
 * saved record handed over whitespace laid out a full blank line under the
 * picture or the zone's label — the rule `visibleCopy` documents from the
 * pinned runtime: `""` is 0px tall and a run of spaces is 16px. Both surfaces
 * read the copy through `visibleCopy` now, so a blank caption paints no line at
 * all while a real one is painted as written.
 */

import { createTestRoot } from "@gpuix/react/testing";
import { lightTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { describe, expect, it } from "vitest";
import { DropZone } from "../drop-zone.js";
import { ImagePreview } from "../image-preview.js";

const PNG = "data:image/png;base64,AA==";

const BLANK_LINE = "   ";

describe("copy that arrived blank in a window", () => {
  it("paints no caption line under a picture", () => {
    const root = createTestRoot({ width: 800, height: 600 });
    root.render(
      <ThemeProvider theme={lightTheme}>
        <ImagePreview src={PNG} alt="photo" caption={BLANK_LINE} />
      </ThemeProvider>,
    );
    root.renderer.flush();
    expect(root.renderer.getAllText()).not.toContain(BLANK_LINE);
    root.unmount();
  });

  it("paints no description line in a drop zone", () => {
    const root = createTestRoot({ width: 800, height: 600 });
    root.render(
      <ThemeProvider theme={lightTheme}>
        <DropZone
          label="Drop files"
          description={BLANK_LINE}
          onDrop={() => undefined}
        />
      </ThemeProvider>,
    );
    root.renderer.flush();
    expect(root.renderer.getAllText()).not.toContain(BLANK_LINE);
    root.unmount();
  });

  it("paints a caption the caller wrote, as written", () => {
    const root = createTestRoot({ width: 800, height: 600 });
    root.render(
      <ThemeProvider theme={lightTheme}>
        <ImagePreview src={PNG} alt="photo" caption="  By Ada  " />
      </ThemeProvider>,
    );
    root.renderer.flush();
    expect(root.renderer.getAllText()).toContain("  By Ada  ");
    root.unmount();
  });
});
