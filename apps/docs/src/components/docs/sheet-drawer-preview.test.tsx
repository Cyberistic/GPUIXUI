import { readFileSync } from "node:fs";
import { elevationShadow, themes } from "@gpuixui/tokens";
import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { toCssVars } from "../../lib/theme-css";
import {
  DrawerDrawing,
  DrawerSurface,
  SheetDrawing,
} from "./sheet-drawer-preview";

const read = (relative: string): string =>
  readFileSync(new URL(relative, import.meta.url), "utf8");

const css = read("../../styles/demos.css").replace(/\/\*[\s\S]*?\*\//g, "");
const drawer = read("../../../../../packages/components/src/drawer.tsx");
const timing = read("../../../../../packages/motion/src/timing.ts");
const drawing = read("./sheet-drawer-preview.tsx");

const rules = (selector: string): ReadonlyArray<string> =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectors]) =>
      (selectors ?? "").split(",").some((one) => one.trim() === selector),
    )
    .map(([, , body]) => body ?? "");

const rule = (selector: string): string => rules(selector).join("\n");

const block = (selector: string): string => rules(selector)[0] ?? "";

const reducedMotion = (): string => {
  const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
  if (start === -1) return "";
  const open = css.indexOf("{", start);
  let depth = 0;
  let end = open;
  for (; end < css.length; end += 1) {
    if (css[end] === "{") depth += 1;
    if (css[end] === "}" && (depth -= 1) === 0) break;
  }
  return css.slice(open + 1, end);
};

const sizeTable = (
  name: "WIDTH" | "HEIGHT",
): Readonly<Record<string, number>> =>
  Object.fromEntries(
    [
      ...(
        new RegExp(
          `const ${name}: Readonly<Record<DrawerSize, number>> = \\{([\\s\\S]*?)\\};`,
        ).exec(drawer)?.[1] ?? ""
      ).matchAll(/(\w+): (\d+)/g),
    ].flatMap((match) =>
      match[1] === undefined || match[2] === undefined
        ? []
        : [[match[1], Number(match[2])]],
    ),
  );

const sheet = renderToStaticMarkup(<SheetDrawing />);
const workflow = renderToStaticMarkup(<DrawerDrawing />);

const surface = (side: "left" | "right" | "bottom" | "top"): string =>
  renderToStaticMarkup(
    <DrawerSurface
      description="preview"
      footer={null}
      onClose={() => undefined}
      panelRef={createRef()}
      side={side}
      size="md"
      title="Preview"
    >
      body
    </DrawerSurface>,
  );

const count = (text: string, needle: RegExp): number =>
  text.match(needle)?.length ?? 0;

describe("the sheet and drawer drawings", () => {
  it("open both pages on the surface, on the component's default edge", () => {
    for (const markup of [sheet, workflow]) {
      expect(count(markup, /role="dialog"/g)).toBe(1);
      expect(markup).toContain('data-side="right"');
      expect(markup).toContain('data-size="md"');
      expect(markup).toContain('aria-label="Close drawer"');
    }

    expect(drawer.replace(/\s+/g, " ")).toContain('? side : "right"');
  });

  it("paints the surface inside a frame that is the window's box", () => {
    expect(block(".gx-drawer-frame")).toContain("width: 100%");
    expect(block(".gx-drawer-frame")).toContain("height: 420px");
    expect(block(".gx-drawer-backdrop")).toContain("inset: 0");
    expect(rule('.gx-drawer[data-side="right"]')).toContain(
      "margin-left: auto",
    );
    expect(rule('.gx-drawer[data-side="left"]')).toContain(
      "margin-right: auto",
    );
    expect(rule('.gx-drawer[data-side="bottom"]')).toContain(
      "margin-top: auto",
    );
    expect(rule('.gx-drawer[data-side="top"]')).toContain(
      "margin-bottom: auto",
    );

    expect(block('.gx-drawer[data-size="md"]')).toContain(
      "--gx-drawer-width: 400px",
    );
    expect(rule('.gx-drawer[data-side="right"]')).toContain(
      "width: min(var(--gx-drawer-width), 100%)",
    );
    expect(rule('.gx-drawer[data-side="bottom"]')).toContain(
      "height: min(var(--gx-drawer-height), 100%)",
    );
  });

  it("mirrors the component's size tables in the style sheet", () => {
    for (const size of ["sm", "md", "lg"] as const) {
      expect(block(`.gx-drawer[data-size="${size}"]`)).toContain(
        `--gx-drawer-width: ${sizeTable("WIDTH")[size]}px`,
      );
      expect(block(`.gx-drawer[data-size="${size}"]`)).toContain(
        `--gx-drawer-height: ${sizeTable("HEIGHT")[size]}px`,
      );
    }
  });

  it("reads the slide's travel and duration out of the library", () => {
    expect(drawer).toContain("isVertical(side) ? box.height : box.width");
    const level = /useSurfaceTiming\("(\w+)"\)/.exec(drawer)?.[1];
    if (level === undefined)
      throw new Error("the drawer names no timing level");
    const milliseconds = Number(
      new RegExp(`${level}: (\\d+)`).exec(timing)?.[1],
    );
    expect(milliseconds).toBeGreaterThan(0);
    expect(block(":root")).toContain(`--gx-overlay-ms: ${milliseconds}ms`);
    expect(block(".gx-drawer")).toContain(
      "animation: gx-sheet-in-right var(--gx-overlay-ms) ease-out",
    );

    const travel = {
      right: "translate: 100% 0",
      left: "translate: -100% 0",
      bottom: "translate: 0 100%",
      top: "translate: 0 -100%",
    } as const;
    for (const [side, offset] of Object.entries(travel)) {
      expect(css, `${side} travels the wrong span`).toContain(offset);
      if (side !== "right") {
        expect(rule(`.gx-drawer[data-side="${side}"]`)).toContain(
          `animation-name: gx-sheet-in-${side}`,
        );
      }
    }
  });

  it("paints the settled frame when the reader asks for less motion", () => {
    const reduced = reducedMotion();
    const animated = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(
        ([, names, body]) =>
          (names ?? "").includes(".gx-drawer") &&
          /animation(?:-name)?\s*:/.test(body ?? "") &&
          !/animation\s*:\s*none/.test(body ?? ""),
      )
      .flatMap(([, names]) =>
        (names ?? "")
          .split(",")
          .map((one) => one.trim())
          .filter((one) => one.startsWith(".gx-drawer")),
      );
    expect(animated.length).toBeGreaterThan(1);
    expect(animated.filter((selector) => !reduced.includes(selector))).toEqual(
      [],
    );
    expect(block(".gx-drawer")).not.toContain("translate");
    expect(block(".gx-drawer")).not.toContain("opacity: 0");

    expect(drawing).not.toMatch(/setTimeout|setInterval/);
  });

  it("travels back out and stays mounted until the exit ends", () => {
    const closed = renderToStaticMarkup(
      <DrawerSurface
        description="preview"
        footer={null}
        onClose={() => undefined}
        open={false}
        panelRef={createRef()}
        side="right"
        size="md"
        title="Preview"
      >
        body
      </DrawerSurface>,
    );
    expect(count(closed, /data-open="false"/g)).toBe(2);

    expect(block('.gx-drawer[data-open="false"]')).toContain(
      "animation-name: gx-sheet-out-right",
    );
    for (const side of ["left", "bottom", "top"] as const) {
      expect(
        block(`.gx-drawer[data-open="false"][data-side="${side}"]`),
        `${side} leaves on the wrong run`,
      ).toContain(`animation-name: gx-sheet-out-${side}`);
    }
    for (const side of ["right", "left", "bottom", "top"]) {
      expect(css).toContain(`@keyframes gx-sheet-out-${side}`);
    }

    expect(block('.gx-drawer[data-open="false"]')).toContain(
      "animation-fill-mode: forwards",
    );
    expect(block('.gx-drawer-backdrop[data-open="false"]')).toContain(
      "animation-name: gx-veil-out",
    );
    expect(css).toContain("@keyframes gx-veil-out");

    expect(css).toMatch(
      /@keyframes gx-sheet-out-right \{[\s\S]*?visibility: hidden;/,
    );
    expect(reducedMotion()).toContain('.gx-drawer[data-open="false"]');
  });

  it("wears the grabber only on a top or bottom edge", () => {
    expect(surface("right")).not.toContain("gx-drawer-grabber");
    expect(surface("left")).not.toContain("gx-drawer-grabber");
    expect(count(surface("bottom"), /gx-drawer-grabber/g)).toBe(1);
    expect(count(surface("top"), /gx-drawer-grabber/g)).toBe(1);
    expect(drawer).toContain("grabber && isVertical(side)");

    const width = /const GRABBER_WIDTH = (\d+)/.exec(drawer)?.[1];
    const height = /const GRABBER_HEIGHT = (\d+)/.exec(drawer)?.[1];
    expect(block(".gx-drawer-grabber")).toContain(`width: ${width}px`);
    expect(block(".gx-drawer-grabber")).toContain(`height: ${height}px`);
    expect(rule('.gx-drawer[data-side="bottom"] .gx-drawer-grabber')).toContain(
      "top: var(--spacing-sm)",
    );
    expect(rule('.gx-drawer[data-side="top"] .gx-drawer-grabber')).toContain(
      "bottom: var(--spacing-sm)",
    );
    expect(toCssVars(themes.dark)["--spacing-sm"]).toBe(
      `${themes.dark.spacing.sm}px`,
    );
  });

  it("rounds the inner corners and lifts the surface with the theme's lg", () => {
    const corners = {
      right: "var(--radius-xl) 0 0 var(--radius-xl)",
      left: "0 var(--radius-xl) var(--radius-xl) 0",
      bottom: "var(--radius-xl) var(--radius-xl) 0 0",
      top: "0 0 var(--radius-xl) var(--radius-xl)",
    } as const;
    for (const [side, radius] of Object.entries(corners)) {
      expect(rule(`.gx-drawer[data-side="${side}"]`)).toContain(
        `border-radius: ${radius}`,
      );
    }
    expect(drawer).toContain("...innerCorners(side, theme.radius.xl)");
    expect(
      drawer.replace(/\s+/g, " "),
      "the surface no longer names the lg level",
    ).toContain('overlaySurfaceStyle(DRAWER_CONTENT, className, theme, "lg")');

    expect(block(".gx-drawer")).toContain("box-shadow: var(--elevation-lg)");
    const vars = toCssVars(themes.dark);
    const lg = elevationShadow(themes.dark, "lg");
    if (lg === undefined) throw new Error("the dark theme has no lg level");
    expect(vars["--elevation-lg"]).toBe(
      `${lg.offsetX}px ${lg.offsetY}px ${lg.blurRadius}px ${lg.spreadRadius}px ${lg.color}`,
    );
    expect(vars["--radius-xl"]).toBe(`${themes.dark.radius.xl}px`);
  });

  it("dismisses on an outside press and focuses without scrolling", () => {
    expect(drawing).toContain("onClick={onBackdrop}");
    expect(drawing).toContain("onBackdrop={dismissible ? close : undefined}");

    const focuses = [...drawing.matchAll(/\.focus\(([^)]*)\)/g)];
    expect(focuses.length).toBeGreaterThan(0);
    expect(
      focuses.filter((match) => !match[1]?.includes("preventScroll")),
    ).toEqual([]);
  });
});
