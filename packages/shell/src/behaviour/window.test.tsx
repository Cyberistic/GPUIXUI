/** @jsxImportSource @gpuix/react */
import { readFileSync } from "node:fs";
import type { TestRoot } from "@gpuix/react/testing";
import { createTestRoot } from "@gpuix/react/testing";
import { lightTheme, platformTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { SourceList, type SourceListSection } from "../window/source-list.js";
import { Window, WindowToolbar } from "../window/window.js";

const theme = platformTheme(lightTheme, "darwin");
const FRAME = { width: 900, height: 520 } as const;

const SECTIONS: ReadonlyArray<SourceListSection> = [
  {
    id: "mail",
    items: [
      { id: "inbox", label: "Inbox", icon: "mail", count: 12 },
      { id: "drafts", label: "Drafts", icon: "file" },
    ],
  },
  {
    id: "folders",
    title: "Folders",
    collapsible: true,
    items: [
      { id: "archive", label: "Archive", icon: "folder" },
      { id: "junk", label: "Junk", icon: "folder" },
    ],
  },
];

let mounted: TestRoot | null = null;

afterEach(() => {
  mounted?.unmount();
  mounted = null;
});

const Mail = () => {
  const [place, setPlace] = useState("inbox");
  return (
    <Window
      platform="darwin"
      testId="window"
      sidebar={
        <SourceList
          label="Mailboxes"
          sections={SECTIONS}
          value={place}
          onValueChange={setPlace}
        />
      }
      toolbar={<WindowToolbar title={place} testId="toolbar" />}
      inspector={<text>Details</text>}
    >
      <text testId="content">{place}</text>
    </Window>
  );
};

const render = (): TestRoot => {
  const root = createTestRoot(FRAME);
  root.render(
    <ThemeProvider theme={theme}>
      <Mail />
    </ThemeProvider>,
  );
  mounted = root;
  root.renderer.flush();
  return root;
};

const element = (root: TestRoot, testId: string) => {
  const found = root.renderer.findByTestId(testId);
  if (found === undefined || found === null) {
    throw new Error(`no element with testId ${testId}`);
  }
  return found;
};

const boundsOf = (root: TestRoot, testId: string) => {
  const bounds = root.renderer.getElementBounds(element(root, testId).id);
  if (bounds === null) throw new Error(`no painted box for ${testId}`);
  return bounds;
};

describe("the window's anatomy", () => {
  it("runs the sidebar from the top edge and sits the toolbar beside it", () => {
    const root = render();
    const row = boundsOf(root, "source-inbox");
    const toolbar = boundsOf(root, "toolbar");

    expect(toolbar.y).toBe(0);
    expect(toolbar.height).toBe(52);

    expect(toolbar.x).toBe(220);
    expect(row.y).toBeGreaterThanOrEqual(52);
    expect(row.height).toBe(28);
  });

  it("starts the content under the toolbar", () => {
    const root = render();
    expect(boundsOf(root, "content").y).toBeGreaterThanOrEqual(52);
  });

  it("paints the sidebar and toolbar as materials, the content opaque", () => {
    const source = readFileSync(
      new URL("../window/window.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain('materialFill(theme, "sidebar")');
    expect(source).toContain('materialFill(theme, "titlebar")');

    expect(
      source.match(/backgroundColor: theme\.colors\.background/g)?.length,
    ).toBe(3);
  });
});

describe("the sidebar's width", () => {
  it("drags from the sidebar's hairline, clamped to its bounds", () => {
    const root = render();
    const seam = boundsOf(root, "window-sidebar-divider");
    const x = seam.x + seam.width / 2;
    const y = seam.y + seam.height / 2;
    root.renderer.nativeSimulateMouseDown(x, y);
    root.renderer.nativeSimulateMouseMove(x + 60, y, 0);
    root.renderer.nativeSimulateMouseUp(x + 60, y);
    root.renderer.flush();
    expect(boundsOf(root, "toolbar").x).toBe(280);

    root.renderer.nativeSimulateMouseDown(x + 60, y);
    root.renderer.nativeSimulateMouseMove(x + 600, y, 0);
    root.renderer.nativeSimulateMouseUp(x + 600, y);
    root.renderer.flush();
    expect(boundsOf(root, "toolbar").x).toBe(360);
  });

  it("answers the arrows and Home from the keyboard", () => {
    const root = render();
    const seam = element(root, "window-sidebar-divider");
    root.renderer.nativeSimulateKeyDown(seam.id, "home");
    root.renderer.flush();
    expect(boundsOf(root, "toolbar").x).toBe(180);
    root.renderer.nativeSimulateKeyDown(seam.id, "right");
    root.renderer.flush();
    expect(boundsOf(root, "toolbar").x).toBe(196);
  });
});

describe("the source list", () => {
  it("moves the choice with the arrow keys", () => {
    const root = render();
    root.renderer.nativeSimulateKeyDown(
      element(root, "source-inbox").id,
      "down",
    );
    root.renderer.flush();
    expect(element(root, "source-drafts").customProps?.["aria-selected"]).toBe(
      true,
    );
    root.renderer.nativeSimulateKeyDown(
      element(root, "source-drafts").id,
      "end",
    );
    root.renderer.flush();
    expect(element(root, "source-junk").customProps?.["aria-selected"]).toBe(
      true,
    );
  });

  it("jumps to the row whose label starts with the typed letters", () => {
    const root = render();
    root.renderer.nativeSimulateKeyDown(element(root, "source-inbox").id, "j");
    root.renderer.flush();
    expect(element(root, "source-junk").customProps?.["aria-selected"]).toBe(
      true,
    );
  });

  it("folds a section, and its rows leave the arrows' path", () => {
    const root = render();
    const header = boundsOf(root, "source-section-folders");
    root.renderer.nativeSimulateClick(
      header.x + 4,
      header.y + header.height / 2,
    );
    root.renderer.flush();
    expect(
      element(root, "source-section-folders").customProps?.["aria-expanded"],
    ).toBe(false);
    expect(root.renderer.findByTestId("source-archive") ?? null).toBeNull();
    root.renderer.nativeSimulateKeyDown(
      element(root, "source-inbox").id,
      "end",
    );
    root.renderer.flush();
    expect(element(root, "source-drafts").customProps?.["aria-selected"]).toBe(
      true,
    );
  });

  it("paints no hover wash on a row it does not choose", () => {
    const root = render();
    const drafts = element(root, "source-drafts");
    expect(drafts.style.backgroundColor).toBeUndefined();
    expect(drafts.style.hover).toBeUndefined();
  });

  it("emphasizes the chosen row only while the list holds focus", () => {
    const root = render();
    expect(element(root, "source-inbox").style.backgroundColor).toBe(
      theme.colors.active,
    );
    const row = boundsOf(root, "source-inbox");
    root.renderer.nativeSimulateClick(row.x + 4, row.y + row.height / 2);
    root.renderer.flush();
    expect(element(root, "source-inbox").style.backgroundColor).toBe(
      theme.colors.primary,
    );
  });
});
