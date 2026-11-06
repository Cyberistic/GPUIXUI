import { readFileSync } from "node:fs";
import { buttonVariants, controlStyle } from "@gpuixui/primitives/core";
import { themes } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import {
  liveBanner,
  liveButtonFill,
  liveIds,
  livePressedFill,
  liveRestingFill,
  LiveScreen,
  liveStatus,
} from "./live-scene";

const root = new URL("../../", import.meta.url);
const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const theme = themes.dark;
const box = { width: 1_000, height: 700 } as const;

interface Element {
  readonly type: unknown;
  readonly prop: (key: string) => unknown;
}

const elementOf = (value: unknown): Element | undefined => {
  if (typeof value !== "object" || value === null) return undefined;
  const props: unknown = Reflect.get(value, "props");
  const type: unknown = Reflect.get(value, "type");
  if (typeof props !== "object" || props === null) return undefined;
  return {
    type,
    prop: (key) => Reflect.get(props, key),
  };
};

const find = (tree: unknown, testId: string): Element | undefined => {
  const element = elementOf(tree);
  if (element === undefined) return undefined;
  if (element.prop("testId") === testId) return element;
  const children: unknown = element.prop("children");
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    const found = find(child, testId);
    if (found !== undefined) return found;
  }
  return undefined;
};

const styleOf = (element: Element | undefined): object | undefined => {
  const style = element?.prop("style");
  return typeof style === "object" && style !== null ? style : undefined;
};

const fillOf = (element: Element | undefined): unknown => {
  const style = styleOf(element);
  return style === undefined
    ? undefined
    : Reflect.get(style, "backgroundColor");
};

const screen = (presses: number) =>
  LiveScreen({ theme, box, presses, onPress: () => undefined });

describe("the live surface's screen", () => {
  it("paints the action in the fill controlStyle resolves", () => {
    const button = find(screen(0), liveIds.button);

    expect(fillOf(button)).toBe(
      controlStyle({ variant: buttonVariants.primary, size: "md" }, theme)
        .backgroundColor,
    );
    expect(liveButtonFill(theme)).toBe(theme.colors.primary);
  });

  it("registers the press handler on the action", () => {
    let pressed = 0;
    const button = find(
      LiveScreen({
        theme,
        box,
        presses: 0,
        onPress: () => {
          pressed += 1;
        },
      }),
      liveIds.button,
    );
    const handler = button?.prop("onClick");

    expect(typeof handler).toBe("function");
    if (typeof handler === "function") Reflect.apply(handler, undefined, []);
    expect(pressed).toBe(1);
  });

  it("keeps the banner resting until a press, then paints the pressed fill", () => {
    expect(fillOf(find(screen(0), liveIds.banner))).toBe(
      liveRestingFill(theme),
    );
    expect(fillOf(find(screen(1), liveIds.banner))).toBe(
      livePressedFill(theme),
    );
    expect(fillOf(find(screen(1), liveIds.banner))).not.toBe(
      liveRestingFill(theme),
    );
    expect(liveBanner.height).toBeGreaterThan(0);
  });

  it("counts the press in the sentence a reader sees", () => {
    expect(liveStatus(0)).toBe("Waiting for a press");
    expect(liveStatus(1)).toBe("Pressed 1 time");
    expect(liveStatus(2)).toBe("Pressed 2 times");
  });

  it("carries the card's heading, so the painted text proves the tree", () => {
    const tree = screen(0);
    const title = find(tree, liveIds.title);

    expect(title?.prop("children")).toBe("A real GPUix frame");
  });
});

describe("the live surface's route", () => {
  it("mounts the screen through the reconciler, not a hand-fed batch", () => {
    const surface = read("src/components/docs/live-surface.tsx");
    const scene = read("src/lib/live-scene.tsx");

    expect(surface).toContain("react.createRoot(host)");
    expect(surface).toContain("<LiveScene");
    expect(surface).toContain("handleGpuixEvent(event, renderer)");
    expect(surface).not.toContain("applyBatch");
    expect(scene).toContain("/** @jsxImportSource @gpuix/react */");
    expect(scene).toContain("controlStyle(");
  });

  it("boots the renderer once, inside the effect", () => {
    const surface = read("src/components/docs/live-surface.tsx");
    const sources = [
      surface,
      read("src/routes/live.tsx"),
      read("src/lib/live-scene.tsx"),
    ].join("\n");

    expect(sources.match(/new glue\.GpuixRenderer\(/g) ?? []).toHaveLength(1);
    expect(sources.match(/\.init\(\{\}\)/g) ?? []).toHaveLength(1);
    expect(surface).toContain(
      'await import("@gpuix/native/wasm/gpuix-web.js")',
    );
    expect(surface).toContain('await import("@gpuix/react")');
    expect(surface.indexOf("useEffect")).toBeLessThan(
      surface.indexOf("await import("),
    );
  });

  it("labels what the surface is, and what a browser without a backend reads", () => {
    const surface = read("src/components/docs/live-surface.tsx");

    expect(surface).toContain("not the native macOS runtime");
    expect(surface).toContain("has no WebGPU or WebGL2");
    expect(surface).toContain("already running");
    expect(read("src/routes/live.tsx")).toContain("<LiveSurface />");
  });

  it("isolates /live in development and in production, and nothing else", () => {
    const vite = read("vite.config.ts");
    const start = read("src/start.ts");
    const headers = [
      "Cross-Origin-Opener-Policy",
      "Cross-Origin-Embedder-Policy",
    ];

    for (const header of headers) {
      expect(vite).toContain(header);
      expect(start.toLowerCase()).toContain(header.toLowerCase());
    }

    expect(vite).toContain('startsWith("/live")');
    expect(start).toContain('pathname.startsWith("/live")');
    expect(start).toContain(
      'if (!pathname.startsWith("/live")) return response;',
    );
  });

  it("keeps the real surface mounted on its own route", () => {
    expect(read("src/routes/live.tsx")).toContain("LiveSurface");
  });

  it("resolves the wasm past the package's exports, in one place", () => {
    const vite = read("vite.config.ts");

    expect(vite).toContain("@gpuix/native/wasm/");
    expect(vite).toContain('"gpuix-web-wasm"');
    expect(read("tsconfig.json")).toContain('"@gpuix/native/wasm/*"');
  });
});
