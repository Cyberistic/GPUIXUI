import type { ThemeMode } from "@gpuixui/tokens";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { demos } from "../components/docs/demos";

/**
 * Every preview demo mounts.
 *
 * `component-preview.test.ts` holds the registry to the pages: every page names
 * a registered demo and every demo is named by a page. Neither direction mounts
 * one, so a demo that throws while it renders — a hook called outside a
 * component, a property read on a missing state, a `usePlatform` consumer with
 * no value — ships as a page that crashes in the browser while every suite
 * stays green. `ComponentPreview` renders `demo.render()` inside
 * `PreviewSurface`, so the same call is mounted here, once per palette.
 *
 * The platform switch is mocked because the real provider reads the router and
 * `window`; the value it hands a preview is the only part a demo sees.
 */

const palette = vi.hoisted((): { mode: ThemeMode } => ({ mode: "light" }));

vi.mock("../components/docs/platform-toggle", async () => {
  const { getTheme } = await import("@gpuixui/tokens");
  return {
    usePlatform: () => ({
      platform: "darwin",
      look: "native",
      mode: palette.mode,
      theme: getTheme(palette.mode),
      setPlatform: () => undefined,
      setLook: () => undefined,
      setMode: () => undefined,
    }),
    usePlatformOptional: () => null,
  };
});

/** A demo's markup, mounted the way `ComponentPreview` mounts it. */
const markup = (render: () => ReactNode): string => {
  const Host = () => <>{render()}</>;
  return renderToStaticMarkup(<Host />);
};

describe.each(["light", "dark"] as const)(
  "every preview demo in the %s palette",
  (mode) => {
    it.each(Object.entries(demos))("mounts %s", (_name, demo) => {
      palette.mode = mode;
      expect(markup(demo.render).length).toBeGreaterThan(20);
    });
  },
);
