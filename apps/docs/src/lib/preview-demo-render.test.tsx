import type { ThemeMode } from "@gpuixui/tokens";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { demos } from "../components/docs/demos";

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
