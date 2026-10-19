import { GPUixVersion, nativePlatforms } from "./native-platforms";
import type { GeneratedSearchEntry } from "./generated-search";

/**
 * The installation page's native-binding table is rendered React, so the
 * Fumadocs page index cannot see its rows (plan 584). This document makes the
 * table's platforms and targets searchable, and promotes the short reader
 * phrases that name it, while a single plain word (`platform`, `binding`) is
 * left to the page that owns the subject.
 */
const readerNames = ["platform support", "native bindings", "native platforms"];

export const platformSearchEntry: GeneratedSearchEntry = {
  names: readerNames,
  index: {
    title: "Platform support",
    description: `The native binding targets GPUix ${GPUixVersion} publishes, and the Intel macOS source build.`,
    content: [
      `GPUix ${GPUixVersion}`,
      ...nativePlatforms.flatMap((platform) => [
        platform.label,
        platform.target,
        platform.published
          ? "prebuilt binary"
          : "no published binary; build the pinned source from this repository",
      ]),
    ].join("\n"),
    url: "/docs/installation#native-bindings",
    breadcrumbs: ["Installation"],
  },
};
