/**
 * Teardown for the behaviour suites: the native renderer paints one retained
 * window, so a test that throws after rendering must not leave its root behind
 * for the next test in the file (plan 326).
 *
 * Two stores outlive a root by design: the event claim with its one-task
 * lifetime (plan 587), and a modal's focus successor, which a closing surface
 * writes for the modal that captured it (plans 826/827). The hook crosses a task
 * boundary so a claim cannot leak, and forgets every successor because native
 * host ids restart with the next renderer, so a stale mark could otherwise
 * retarget a later modal (plan 830).
 *
 * Registered through `vitest.behaviour.config.ts`; it runs after a passing test
 * and after a failing one alike.
 */

import { afterEach } from "vitest";
import { clearFocusSuccessors } from "../internal/focus-successor.js";
import { unmountComponentRoot } from "../internal/test-root.js";

afterEach(async () => {
  unmountComponentRoot();
  clearFocusSuccessors();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
});
