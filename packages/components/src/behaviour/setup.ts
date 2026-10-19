/**
 * Teardown for the behaviour suites: the native renderer paints one retained
 * window, so a test that throws after rendering must not leave its root behind
 * for the next test in the file (plan 326).
 *
 * The event claim is module state with a one-task lifetime (plan 587), so the
 * hook also crosses a task boundary: a test's last gesture leaves its claim
 * behind until the task ends, and a real next gesture is a new task.
 *
 * Registered through `vitest.behaviour.config.ts`; it runs after a passing test
 * and after a failing one alike.
 */

import { afterEach } from "vitest";
import { unmountComponentRoot } from "../internal/test-root.js";

afterEach(async () => {
  unmountComponentRoot();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
});
