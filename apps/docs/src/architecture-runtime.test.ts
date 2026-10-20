import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

/**
 * Guards plan 602: the Architecture page must state the runtime contract it
 * claims. The bug being prevented is a claim with no source — the page named
 * neither Effect nor where the library, the live surface and this site render,
 * so `effect` returned a keyboard table and `browser` returned a pattern page.
 *
 * Every test compares the page with the file the claim is about, in both
 * directions: a source that changes makes the page fail, and a page that states
 * a fact the source no longer has fails too.
 *
 * `readFileSync`/`Schema` are deliberate: `apps/docs` has no Effect runtime in
 * its bundle (`architecture.test.ts`), and every docs content guard reads
 * repository files the same way (`typography-truth.test.ts`).
 */
const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const page = read("../content/docs/architecture.mdx");
const toastProvider = read(
  "../../../packages/components/src/toast/provider.tsx",
);
const countdown = read("../../../packages/components/src/countdown.tsx");
const previewState = read("./components/preview/theme-surface.tsx");
const liveSurface = fileURLToPath(
  new URL("../public/gpuix-preview/index.html", import.meta.url),
);

const ManifestWithDependencies = Schema.Struct({
  dependencies: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
});

const componentsManifest = Schema.decodeUnknownSync(
  Schema.fromJsonString(ManifestWithDependencies),
)(read("../../../packages/components/package.json"));

/** The facts the page asserts, each read from the file that owns it. */
export interface RuntimeFacts {
  readonly page: string;
  readonly toastOwnsRuntime: boolean;
  readonly declaresEffectDependency: boolean;
  readonly countdownOwnsNoTimer: boolean;
  readonly previewReadsPublishedState: boolean;
  readonly liveSurfaceExists: boolean;
}

const PAGE = {
  effectSection: "## State and Effect",
  runsWhere: "## What runs where",
  managedRuntime: "ManagedRuntime",
  toastProvider: "ToastProvider",
  dependency: "declares `effect`",
  countdown: "Countdown",
  remainingMs: "remainingMs",
  countdownClaim: "owns no timer",
  previewTokens: ["`data-platform`", "`dark` class", "useSyncExternalStore"],
  liveSurfaceTokens: ["`/gpuix-preview/`", "WebAssembly"],
} as const;

const hasAll = (text: string, tokens: ReadonlyArray<string>): boolean =>
  tokens.every((token) => text.includes(token));

/**
 * Every way the page can disagree with the code. Pure, so each rule has a
 * fixture test and the real-page test is one call.
 */
export const architectureViolations = (
  facts: RuntimeFacts,
): ReadonlyArray<string> => {
  const { page: text } = facts;
  const namesToastRuntime =
    text.includes(PAGE.managedRuntime) && text.includes(PAGE.toastProvider);
  const claimsCountdownBoundary =
    text.includes(PAGE.countdown) &&
    text.includes(PAGE.remainingMs) &&
    text.includes(PAGE.countdownClaim);
  const claimsPublishedState = hasAll(text, PAGE.previewTokens);
  const namesLiveSurface = hasAll(text, PAGE.liveSurfaceTokens);
  return [
    ...(text.includes(PAGE.effectSection)
      ? []
      : ["the page has no `## State and Effect` section"]),
    ...(text.includes(PAGE.runsWhere)
      ? []
      : ["the page has no `## What runs where` section"]),
    ...(facts.toastOwnsRuntime && !namesToastRuntime
      ? ["the page does not name the toast `ManagedRuntime`"]
      : []),
    ...(!facts.toastOwnsRuntime && namesToastRuntime
      ? ["the page names a toast runtime `provider.tsx` no longer creates"]
      : []),
    ...(facts.declaresEffectDependency && !text.includes(PAGE.dependency)
      ? ["the page does not state that `@gpuixui/components` declares `effect`"]
      : []),
    ...(!facts.declaresEffectDependency && text.includes(PAGE.dependency)
      ? [
          "the page claims an `effect` dependency the package no longer declares",
        ]
      : []),
    ...(facts.countdownOwnsNoTimer && !claimsCountdownBoundary
      ? [
          "the page does not say Countdown takes `remainingMs` and owns no timer",
        ]
      : []),
    ...(!facts.countdownOwnsNoTimer && claimsCountdownBoundary
      ? [
          "the page says Countdown owns no timer, but countdown.tsx schedules one",
        ]
      : []),
    ...(facts.previewReadsPublishedState && !claimsPublishedState
      ? ["the page does not name the published `data-platform` / `dark` state"]
      : []),
    ...(!facts.previewReadsPublishedState && claimsPublishedState
      ? [
          "the page claims previews read the published document state, but theme-surface.tsx does not",
        ]
      : []),
    ...(facts.liveSurfaceExists && !namesLiveSurface
      ? ["the page does not name the `/gpuix-preview/` wasm document"]
      : []),
    ...(!facts.liveSurfaceExists && namesLiveSurface
      ? ["the page names a `/gpuix-preview/` document that does not exist"]
      : []),
  ];
};

const facts: RuntimeFacts = {
  page,
  toastOwnsRuntime:
    /ManagedRuntime\.make/.test(toastProvider) &&
    /storeLayer\(/.test(toastProvider),
  declaresEffectDependency:
    componentsManifest.dependencies?.["effect"] !== undefined,
  countdownOwnsNoTimer:
    countdown.includes(PAGE.remainingMs) &&
    !/set(Interval|Timeout)\(/.test(countdown),
  previewReadsPublishedState: hasAll(previewState, [
    "data-platform",
    "dark",
    "useSyncExternalStore",
  ]),
  liveSurfaceExists: existsSync(liveSurface),
};

const withFacts = (overrides: Partial<RuntimeFacts>) =>
  architectureViolations({ ...facts, ...overrides });

describe("Architecture states the runtime contract", () => {
  it("reports a page that lost the Effect section", () => {
    expect(
      withFacts({ page: page.replace(PAGE.effectSection, "## State") }),
    ).toContain("the page has no `## State and Effect` section");
  });

  it("reports a page that lost the render table", () => {
    expect(
      withFacts({ page: page.replace(PAGE.runsWhere, "## Runtimes") }),
    ).toContain("the page has no `## What runs where` section");
  });

  it("reports a page that stops naming the toast runtime", () => {
    expect(
      withFacts({ page: page.replace(PAGE.managedRuntime, "runtime") }),
    ).toContain("the page does not name the toast `ManagedRuntime`");
    expect(withFacts({ toastOwnsRuntime: false })).toContain(
      "the page names a toast runtime `provider.tsx` no longer creates",
    );
  });

  it("reports a page that stops stating the Effect dependency", () => {
    expect(
      withFacts({ page: page.replace(PAGE.dependency, "uses effect") }),
    ).toContain(
      "the page does not state that `@gpuixui/components` declares `effect`",
    );
    expect(withFacts({ declaresEffectDependency: false })).toContain(
      "the page claims an `effect` dependency the package no longer declares",
    );
  });

  it("reports a countdown that starts owning time", () => {
    expect(
      withFacts({ page: page.replace(PAGE.countdownClaim, "renders") }),
    ).toContain(
      "the page does not say Countdown takes `remainingMs` and owns no timer",
    );
    expect(withFacts({ countdownOwnsNoTimer: false })).toContain(
      "the page says Countdown owns no timer, but countdown.tsx schedules one",
    );
  });

  it("reports a page that stops naming the published preview state", () => {
    expect(
      withFacts({ page: page.replace("useSyncExternalStore", "a snapshot") }),
    ).toContain(
      "the page does not name the published `data-platform` / `dark` state",
    );
    expect(withFacts({ previewReadsPublishedState: false })).toContain(
      "the page claims previews read the published document state, but theme-surface.tsx does not",
    );
  });

  it("reports a page whose live surface has moved", () => {
    expect(
      withFacts({ page: page.replace("`/gpuix-preview/`", "/preview") }),
    ).toContain("the page does not name the `/gpuix-preview/` wasm document");
    expect(withFacts({ liveSurfaceExists: false })).toContain(
      "the page names a `/gpuix-preview/` document that does not exist",
    );
  });

  it("passes the shipped page against the real sources", () => {
    expect(architectureViolations(facts)).toEqual([]);
  });
});
