import type { GeneratedSearchEntry } from "./generated-search";
import {
  excludedTestMethods,
  testElementFields,
  testMethodGroups,
  testingAbsences,
  testWindowFields,
} from "./test-surface";

/**
 * The testing catalogue's search document (plan 628). The page renders its
 * tables React, and generated type-table rows are dropped from search (plan
 * 479), so without this document the renderer's spellings have no home:
 * measured 2026-10-20, `createTestRoot`, `hasNativeTestRenderer`, `jsdom`,
 * `playwright` and `storybook` returned nothing and `test renderer` reached a
 * Hotkey input limitation.
 *
 * Only distinctive spellings are promoted — the type names, `createTestRoot`,
 * the camelCase methods and `hasNativeTestRenderer`. `testId` stays unpromoted
 * because Component API owns it (plan 587), the selection methods are on
 * Selection and find (plan 627), and plain words (`flush`, `mock`, `fixture`)
 * are indexed but keep their owner until a page alias claims the whole query.
 */
const methods = testMethodGroups.flatMap((group) => group.methods);

export const testingSearchEntry: GeneratedSearchEntry = {
  names: [
    "TestRenderer",
    "TestElement",
    "TestWindowOptions",
    "TestRendererOptions",
    "A11yTreeDump",
    "createTestRoot",
    "hasNativeTestRenderer",
    ...methods.map((method) => method.name),
  ],
  index: {
    title: "Testing your components",
    description:
      "Test a GPUix screen without a DOM: the native test renderer, createTestRoot, the TestRenderer methods, the one-window rule and a gated suite. jsdom, React Testing Library, Playwright and Storybook are absent.",
    content: [
      "There is no DOM: GPUix paints a native tree. createTestRoot mounts a React tree in an offscreen window and returns a TestRenderer that runs the real render, layout and paint pipeline.",
      "hasNativeTestRenderer says whether the binding loaded. A static import of @gpuix/react/testing fails to load on a host with no published @gpuix/native binary, so component behaviour suites live in their own vitest project.",
      "One window at a time: a second live root takes the window over, so unmount before the next root and disable file parallelism.",
      ...testWindowFields.map(
        (field) => `test window ${field.name}: ${field.summary}`,
      ),
      ...testElementFields.map(
        (field) => `TestElement ${field.name}: ${field.summary}`,
      ),
      ...methods.map((method) => `${method.name}: ${method.summary}`),
      ...excludedTestMethods.map(
        (method) => `${method.name} is documented on ${method.owner}.`,
      ),
      "A render is synchronous: flush runs the pipeline, drainEvents collects events and dispatchNativeEvents runs React updates. There is no act and no waitFor.",
      ...testingAbsences.map(
        (absence) => `${absence.subject}: ${absence.statement}`,
      ),
    ].join("\n"),
    url: "/docs/testing",
    breadcrumbs: ["Testing your components"],
    keywords: [
      "test renderer",
      "component test",
      "unit test",
      "testing library",
      "jsdom",
      "playwright",
      "storybook",
      "snapshot",
      "visual regression",
      "fixture",
      "mock",
      ...methods.map((method) => method.name),
      ...testElementFields.map((field) => field.name),
    ].join(" "),
  },
};
