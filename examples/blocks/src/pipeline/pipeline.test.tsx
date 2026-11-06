import { createTestRoot } from "@gpuix/react/testing";
import { lightTheme, platformTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stages, work } from "./data.js";
import { Pipeline } from "./pipeline.js";

const theme = platformTheme(lightTheme, "darwin");

vi.setConfig({ testTimeout: 20_000 });

let unmount = () => {};
afterEach(() => unmount());

const mount = () => {
  const root = createTestRoot({ width: 1280, height: 800 });
  root.render(
    <ThemeProvider theme={theme}>
      <Pipeline platform="darwin" />
    </ThemeProvider>,
  );
  root.renderer.flush();
  unmount = root.unmount;
  return root.renderer;
};

type Renderer = ReturnType<typeof mount>;

const press = (r: Renderer, testId: string) => {
  const element = r.findByTestId(testId);
  const b = element === undefined ? null : r.getElementBounds(element.id);
  expect(b, testId).not.toBeNull();
  r.nativeSimulateClick(b!.x + b!.width / 2, b!.y + b!.height / 2);
  r.flush();
};

const present = (r: Renderer, ids: ReadonlyArray<string>) =>
  ids.filter((id) => r.findByTestId(id) !== undefined).length;

const rows = (r: Renderer) =>
  present(
    r,
    work.map((item) => `work-${item.id}`),
  );

describe("the pipeline block", () => {
  it("opens on Build and shows that stage's five items", () => {
    const r = mount();
    expect(rows(r)).toBe(5);
  });

  it("changes the rows when a stage is pressed", () => {
    const r = mount();
    press(r, "segment-Review");
    expect(rows(r)).toBe(3);
  });

  it("narrows the list to the viewer's work", () => {
    const r = mount();
    press(r, "source-mine");
    expect(rows(r)).toBe(2);
  });

  it("chooses the pressed item for the inspector", () => {
    const r = mount();
    press(r, "work-w1");
    expect(r.findByTestId("work-w1")?.style.backgroundColor).toBe(
      theme.colors.selected,
    );
    expect(r.findByTestId("work-w5")?.style.backgroundColor).toBeUndefined();
    expect(r.findByTestId("inspector")).toBeDefined();
  });

  it("switches to a board of five stage columns", () => {
    const r = mount();
    press(r, "segment-board");
    expect(rows(r)).toBe(0);
    expect(
      present(
        r,
        stages.map((stage) => `column-${stage}`),
      ),
    ).toBe(5);
  });

  it("chooses a card pressed on the board", () => {
    const r = mount();
    press(r, "segment-board");
    press(r, "card-w9");
    press(r, "segment-list");
    press(r, "segment-Idea");
    expect(r.findByTestId("work-w9")?.style.backgroundColor).toBe(
      theme.colors.selected,
    );
  });
});
