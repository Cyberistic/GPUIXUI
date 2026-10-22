import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { themes } from "@gpuixui/tokens";

/**
 * The GPUix web build, and what the preview policy may say about it.
 *
 * `@gpuix/native@0.11.0` ships a second target beside the native binding: a
 * `browser` entry over a wasm renderer that owns a document-level `<canvas>`.
 * That is strategy 1 in `docs/preview-strategy.md` — a **real** GPUix surface in
 * the docs — and it changes what a preview may claim. The policy is the only
 * place the status lives, so it is held to the package it describes: the browser
 * entry, the shared-memory requirement and the build's size are read from the
 * installed 0.11.0 files, and the "not mounted" sentence is checked against the
 * tree in both directions.
 *
 * The installed copy read here is the one the docs app itself installs: `/live`
 * imports the browser build, so the app declares the dependency. The guard reads
 * that copy rather than the playground's, and the dependency is part of what it
 * holds — a route cannot import a package the manifest does not declare.
 */

const root = new URL("../../../../", import.meta.url);
const native = new URL("apps/docs/node_modules/@gpuix/native/", root);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");
const readNative = (path: string): string =>
  readFileSync(new URL(path, native), "utf8");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const manifest = (path: string): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(read(path));
  if (!isRecord(parsed)) throw new Error(`${path} is not a manifest`);
  return parsed;
};

/** The workspace's pinned runtime version, from the root catalogue. */
const catalogPin = (): unknown => {
  const workspaces = manifest("package.json").workspaces;
  if (!isRecord(workspaces) || !isRecord(workspaces.catalog)) {
    throw new Error("the root manifest declares no catalog");
  }
  return workspaces.catalog["@gpuix/native"];
};

const nativeManifest = (): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(readNative("package.json"));
  if (!isRecord(parsed))
    throw new Error("the native manifest is not an object");
  return parsed;
};

const policy = read("docs/preview-strategy.md");

/** Every non-test module the docs app ships. */
const appSources = (): ReadonlyArray<string> =>
  readdirSync(new URL("src/", new URL("apps/docs/", root)), {
    recursive: true,
    encoding: "utf8",
  })
    .filter((name) => /\.tsx?$/.test(name) && !name.includes(".test."))
    .map((name) => `apps/docs/src/${name}`);

/**
 * The modules that import the browser build.
 *
 * Importing `@gpuix/native` from a page is what mounts a live surface, so the
 * policy's status cannot outlive this list in either direction.
 */
const liveImports = (): ReadonlyArray<string> =>
  appSources().filter((path) =>
    /(?:from\s+|import\()\s*["']@gpuix\/native(?:\/[^"']*)?["']/.test(
      read(path),
    ),
  );

const saysMounted = (): boolean =>
  policy.includes("**The site mounts it, on one route.**");

describe("the GPUix web build", () => {
  it("is a browser export of the version the workspace pins", () => {
    expect(nativeManifest().version).toBe(catalogPin());
    expect(nativeManifest().browser).toBe("browser.mjs");
  });

  it("exports the renderer the policy names", () => {
    const entry = readNative("browser.mjs");

    // The browser build is the renderer, not a test double: the same class the
    // native entry exports, over the wasm module.
    expect(entry).toContain("GpuixRenderer");
    expect(entry).toContain("wasm/gpuix-web.js");
    expect(entry).toContain("gpuix-web_bg.wasm");
  });

  it("asks for shared memory, so the policy keeps the isolation requirement", () => {
    const glue = readNative("wasm/gpuix-web.js");
    const shared = /shared:\s*true/.test(glue);

    // The premise: if the build stops sharing its memory, the COOP/COEP
    // requirement must be retracted from the policy in the same change.
    expect(shared).toBe(true);
    expect(policy).toContain("Cross-Origin-Opener-Policy");
    expect(policy).toContain("Cross-Origin-Embedder-Policy");
    expect(policy).toContain("SharedArrayBuffer");

    // The singleton contract the site must design around.
    expect(policy).toContain("GPUIX web is already running");
    expect(policy).toContain("one top-level window");
    expect(policy).toContain("WebGPU");
    expect(policy).toContain("WebGL2");
  });

  it("quotes the build's real size", () => {
    const bytes = statSync(new URL("wasm/gpuix-web_bg.wasm", native)).size;
    const mib = (bytes / 1024 / 1024).toFixed(1);

    // A bigger build changes the number the policy prints, so the size claim
    // cannot go stale (and plan 440's 25 MiB STOP condition has a source).
    expect(policy).toContain(`${mib} MiB`);
    expect(bytes).toBeGreaterThan(1024 * 1024);
  });

  it("keeps the policy's status and the tree in agreement", () => {
    const mounted = liveImports();

    // Both directions: the one module that mounts the build is the live
    // surface, and the policy says so. A second importer means a second surface
    // the platform cannot host; dropping the importer means the policy claims a
    // mount that is gone.
    expect({
      mounts: mounted,
      saysMounted: saysMounted(),
    }).toEqual({
      mounts: ["apps/docs/src/components/docs/live-surface.tsx"],
      saysMounted: true,
    });
  });

  it("declares the package the route imports", () => {
    const dependencies = manifest("apps/docs/package.json").dependencies;

    // A route that resolves the wasm through an undeclared package builds on
    // this machine and nowhere else.
    expect(
      isRecord(dependencies) ? dependencies["@gpuix/native"] : undefined,
    ).toBe("catalog:");
  });

  it("names the plan that would mount it", () => {
    // The status points a reader at the work, not at a mystery.
    expect(policy).toContain("440-live-gpuix-web-surface");
  });

  it("holds the measured paint to the probe that measures it", () => {
    const probe = read("apps/docs/scripts/live-surface-probe.ts");
    const frame = read("apps/docs/scripts/live-frame.ts");

    // The policy says a paint was measured and prints how to reproduce it; the
    // command has to be the file, and the file has to read the same installed
    // copy this guard reads (the docs app declares no dependency on it yet).
    expect(policy).toContain("### The paint is measured");
    expect(policy).toContain("nub apps/docs/scripts/live-surface-probe.ts");
    expect(probe).toContain("apps/docs/node_modules/@gpuix/native");

    // The frame's verdict is the pixel, not the screenshot's existence — the
    // first probe passed on a white frame for exactly that reason.
    expect(frame).toContain("probePoint");
    expect(frame).toContain("the frame painted");
    expect(probe).toContain("fillAt");
  });

  it("keeps the probes host tools", () => {
    // A route lives under `src/`; both probes live beside the app, so the
    // browser driver is never bundled into the Worker.
    expect(read("apps/docs/scripts/live-route-probe.ts")).toContain(
      "openChrome",
    );
    expect(
      appSources().filter((path) => path.includes("chrome-session")),
    ).toEqual([]);
    expect(policy).toContain("nub apps/docs/scripts/live-route-probe.ts");
  });

  it("quotes the roles the route sample was taken from", () => {
    // The route probe reads three pixels out of a real frame: the button's
    // fill, the banner's resting fill and the banner's fill after a press.
    // All three are opaque role literals — `controlStyle`'s `primary`, the
    // banner's `muted` and the listener's `successSoft` — so a palette move
    // makes the printed sample a measurement of a theme that no longer ships.
    // The values come from the package, never retyped, so the next move fails
    // here instead of leaving the policy quoting an old hex.
    const dark = themes.dark.colors;
    expect(dark.primary.toLowerCase()).toBe("#a7a9ff");
    expect(policy).toContain(
      `\`${dark.primary.toLowerCase()}\` (\`controlStyle\`'s dark primary)`,
    );
    expect(policy).toContain(
      `the banner \`${dark.muted.toLowerCase()}\` (\`muted\`)`,
    );
    expect(policy).toContain(
      `\`${dark.successSoft.toLowerCase()}\` (\`successSoft\`)`,
    );
  });
});
