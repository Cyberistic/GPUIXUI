/**
 * The blocks the docs can paint through the real renderer.
 *
 * A block page used to show a capture (or a drawing) of the block. The browser
 * build of GPUix can mount the block itself, so the page mounts the real tree in
 * an iframe — one document per surface, because the renderer owns one canvas per
 * document — and the capture stays behind it as the backdrop until the first
 * frame paints, and as the picture a browser without WebGPU/WebGL2 keeps.
 *
 * Each entry loads its package lazily: only the block a reader opened crosses
 * the wire, and the wasm glue is imported by the route's effect, never at module
 * scope, so the server build never evaluates it.
 */
import type { ReactNode } from "react";

export interface LiveBlock {
  /** The block's design size, used for the frame's aspect ratio. */
  readonly width: number;
  readonly height: number;
  /** Loads a component that renders the block; the route mounts it. */
  readonly load: (variant?: string) => Promise<() => ReactNode>;
}

export const liveBlocks: Readonly<Record<string, LiveBlock>> = {
  agent: {
    width: 1100,
    height: 700,
    load: async () => {
      const { Agent } = await import("@gpuixui/blocks/agent");
      return () => <Agent platform="darwin" />;
    },
  },
  calendar: {
    width: 1100,
    height: 700,
    load: async () => {
      const { CalendarBlock } = await import("@gpuixui/blocks/calendar");
      return () => <CalendarBlock />;
    },
  },
  desktop: {
    width: 1280,
    height: 800,
    load: async (variant) => {
      const { DesktopBlock } = await import("@gpuixui/blocks/desktop");
      const look = variant === "luna" ? "luna" : "aero";
      return () => <DesktopBlock look={look} />;
    },
  },
  dashboard: {
    width: 1400,
    height: 900,
    load: async () => {
      const { Dashboard } = await import("@gpuixui/blocks/dashboard");
      return () => <Dashboard />;
    },
  },
  editor: {
    width: 1100,
    height: 700,
    load: async () => {
      const { Editor } = await import("@gpuixui/blocks/editor");
      return () => <Editor platform="darwin" />;
    },
  },
  launcher: {
    width: 1100,
    height: 700,
    load: async () => {
      const { Launcher } = await import("@gpuixui/blocks/launcher");
      return () => <Launcher />;
    },
  },
  license: {
    width: 1100,
    height: 700,
    load: async () => {
      const { License } = await import("@gpuixui/blocks/license");
      return () => <License />;
    },
  },
  macos: {
    width: 1280,
    height: 800,
    load: async () => {
      const { MacosDesktop } = await import("@gpuixui/blocks/macos");
      return () => <MacosDesktop width={1280} height={800} />;
    },
  },
  menubar: {
    width: 1100,
    height: 700,
    load: async () => {
      const { MenuBar } = await import("@gpuixui/blocks/menubar");
      return () => <MenuBar />;
    },
  },
  monitor: {
    width: 1100,
    height: 700,
    load: async () => {
      const { Monitor } = await import("@gpuixui/blocks/monitor");
      return () => <Monitor platform="darwin" />;
    },
  },
  music: {
    width: 1100,
    height: 700,
    load: async () => {
      const { Music } = await import("@gpuixui/blocks/music");
      return () => <Music platform="darwin" />;
    },
  },
  notes: {
    width: 1100,
    height: 700,
    load: async () => {
      const { Notes } = await import("@gpuixui/blocks/notes");
      return () => <Notes />;
    },
  },
  pipeline: {
    width: 1100,
    height: 700,
    load: async () => {
      const { Pipeline } = await import("@gpuixui/blocks/pipeline");
      return () => <Pipeline platform="darwin" />;
    },
  },
  preferences: {
    width: 1100,
    height: 700,
    load: async () => {
      const { Preferences } = await import("@gpuixui/blocks/preferences");
      return () => <Preferences />;
    },
  },
  viewer: {
    width: 1100,
    height: 700,
    load: async () => {
      const { Viewer } = await import("@gpuixui/blocks/viewer");
      return () => <Viewer />;
    },
  },
  welcome: {
    width: 1100,
    height: 700,
    load: async () => {
      const { Welcome } = await import("@gpuixui/blocks/welcome");
      return () => <Welcome />;
    },
  },
};

/** The entry a slug names, if the docs can paint that block live. */
export const liveBlockOf = (slug: string): LiveBlock | undefined =>
  Object.hasOwn(liveBlocks, slug) ? liveBlocks[slug] : undefined;
