import type { GeneratedSearchEntry } from "./generated-search";

/**
 * The render-error vocabulary (plan 626). Troubleshooting gained
 * `## A component throws`, but its symbols are runtime API, so the page index
 * never contains the spellings a reader types: measured 2026-10-20,
 * `onUncaughtError` returned nothing and `error boundary` reached Inline
 * validation.
 *
 * The bare word `error` is deliberately not promoted: Inline validation owns
 * error messages, and the regression table in `search.test.ts` keeps it there.
 */
export const troubleshootingErrorSearchEntry: GeneratedSearchEntry = {
  names: [
    "onUncaughtError",
    "getDerivedStateFromError",
    "runtime-error-overlay",
  ],
  index: {
    title: "Troubleshooting",
    description:
      "What happens when a component throws: a class error boundary, the runtime's uncaught-error overlay, and createRoot's onUncaughtError.",
    content: [
      "A component that throws during render is caught by a class error boundary with getDerivedStateFromError.",
      "Without a boundary, render() paints the runtime's overlay: the heading Uncaught runtime errors, a scrollable stack and a reload control with the test id runtime-error-overlay.",
      "createRoot accepts onUncaughtError, which replaces the default console error; render() does not expose it and always installs the overlay.",
      "render() also installs process-level uncaughtException and unhandledRejection handlers, so an async throw paints the same overlay instead of ending the process.",
      "A boundary does not catch async rejections; the process handlers do. There is no hook-based boundary and the overlay is not themed.",
    ].join("\n"),
    url: "/docs/troubleshooting",
    breadcrumbs: ["Troubleshooting"],
    keywords:
      "error boundary uncaught error component throws render error runtime error onUncaughtError getDerivedStateFromError overlay stack",
  },
};
