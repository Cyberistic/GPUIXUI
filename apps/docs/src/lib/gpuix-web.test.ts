import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { themes } from "@gpuixui/tokens";

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

const ledger = read("apps/docs/README.md");

const record = read("docs/gpuix-capabilities.md");

const webSize = (): string =>
  (
    statSync(new URL("wasm/gpuix-web_bg.wasm", native)).size /
    1024 /
    1024
  ).toFixed(1);

const appSources = (): ReadonlyArray<string> =>
  readdirSync(new URL("src/", new URL("apps/docs/", root)), {
    recursive: true,
    encoding: "utf8",
  })
    .filter((name) => /\.tsx?$/.test(name) && !name.includes(".test."))
    .map((name) => `apps/docs/src/${name}`);

const liveImports = (): ReadonlyArray<string> =>
  appSources().filter((path) => read(path).includes("new glue.GpuixRenderer("));

const saysMounted = (): boolean =>
  policy.includes("**The site mounts it, on one route.**");

describe("the GPUix web build", () => {
  it("is a browser export of the version the workspace pins", () => {
    expect(nativeManifest().version).toBe(catalogPin());
    expect(nativeManifest().browser).toBe("browser.mjs");
  });

  it("exports the renderer the policy names", () => {
    const entry = readNative("browser.mjs");

    expect(entry).toContain("GpuixRenderer");
    expect(entry).toContain("wasm/gpuix-web.js");
    expect(entry).toContain("gpuix-web_bg.wasm");
  });

  it("asks for shared memory, so the policy keeps the isolation requirement", () => {
    const glue = readNative("wasm/gpuix-web.js");
    const shared = /shared:\s*true/.test(glue);

    expect(shared).toBe(true);
    expect(policy).toContain("Cross-Origin-Opener-Policy");
    expect(policy).toContain("Cross-Origin-Embedder-Policy");
    expect(policy).toContain("SharedArrayBuffer");

    expect(policy).toContain("GPUIX web is already running");
    expect(policy).toContain("one top-level window");
    expect(policy).toContain("WebGPU");
    expect(policy).toContain("WebGL2");
  });

  it("quotes the build's real size", () => {
    const bytes = statSync(new URL("wasm/gpuix-web_bg.wasm", native)).size;

    expect(policy).toContain(`${webSize()} MiB`);
    expect(bytes).toBeGreaterThan(1024 * 1024);
  });

  it("publishes the browser target in the capability record", () => {
    const prose = record.replace(/\s+/g, " ");

    expect(prose).toContain("## 6. The browser build");
    expect(prose).toContain(`${webSize()} MiB`);
    expect(prose).toContain("`/live`");
    expect(prose).toContain("GPUIX web is already running");
    expect(prose).toContain("Cross-Origin-Opener-Policy");
    expect(prose).toContain("Cross-Origin-Embedder-Policy");
    expect(prose).toContain("SharedArrayBuffer");
    expect(prose).toContain("WebGPU");
    expect(prose).toContain("WebGL2");
    expect(prose).toContain("browser approximation");

    expect(policy).toContain("docs/gpuix-capabilities.md");
  });

  it("keeps the policy's status and the tree in agreement", () => {
    const mounted = liveImports();

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

    expect(
      isRecord(dependencies) ? dependencies["@gpuix/native"] : undefined,
    ).toBe("catalog:");
    expect(
      isRecord(dependencies) ? dependencies["@gpuix/react"] : undefined,
    ).toBe("catalog:");
  });

  it("names the plan that would mount it", () => {
    expect(policy).toContain("440-live-gpuix-web-surface");
  });

  it("keeps the plan's status and the route in agreement", () => {
    const plan = read(".agents/slop/plans/440-live-gpuix-web-surface.md");
    const index = read(".agents/slop/plans/README.md");
    const surface = read("apps/docs/src/components/docs/live-surface.tsx");
    const usesReconciler = /import\(\s*["']@gpuix\/react["']\s*\)/.test(
      surface,
    );

    expect(read("apps/docs/src/routes/live.tsx")).toContain(
      'createFileRoute("/live")',
    );
    expect(plan).not.toContain("the `/live` route is **not built**");
    expect(plan).toContain("## 6. Outcome (landed)");
    expect(plan).toContain("apps/docs/src/routes/live.tsx");
    expect(index).not.toContain("the route is unbuilt");
    expect(index).toMatch(
      /\| \[440\]\(\.\/440-live-gpuix-web-surface\.md\) \|.*\| \*\*implemented\*\*/,
    );
    expect(plan.includes("**Still owed:**")).toBe(!usesReconciler);
  });

  it("holds the measured paint to the probe that measures it", () => {
    const probe = read("apps/docs/scripts/live-surface-probe.ts");
    const frame = read("apps/docs/scripts/live-frame.ts");

    expect(policy).toContain("### The paint is measured");
    expect(policy).toContain("nub apps/docs/scripts/live-surface-probe.ts");
    expect(probe).toContain("apps/docs/node_modules/@gpuix/native");

    expect(frame).toContain("probePoint");
    expect(frame).toContain("the frame painted");
    expect(probe).toContain("fillAt");
  });

  it("keeps the probes host tools", () => {
    expect(read("apps/docs/scripts/live-route-probe.ts")).toContain(
      "openChrome",
    );
    expect(
      appSources().filter((path) => path.includes("chrome-session")),
    ).toEqual([]);
    expect(policy).toContain("nub apps/docs/scripts/live-route-probe.ts");
  });

  it("quotes the roles the route sample was taken from", () => {
    const dark = themes.dark.colors;
    expect(dark.primary.toLowerCase()).toBe("#a7a9ff");
    const sampled = [
      `\`${dark.primary.toLowerCase()}\` (\`controlStyle\`'s dark primary)`,
      `the banner \`${dark.muted.toLowerCase()}\` (\`muted\`)`,
      `\`${dark.successSoft.toLowerCase()}\` (\`successSoft\`)`,
    ];
    expect(sampled.filter((line) => !policy.includes(line))).toEqual([]);
    expect(sampled.filter((line) => !ledger.includes(line))).toEqual([]);
  });
});
