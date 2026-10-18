/**
 * Teardown for the behaviour suites: the native renderer paints one retained
 * window, so a test that throws after rendering must not leave its root behind
 * for the next test in the file (plan 326).
 *
 * Registered through `vitest.behaviour.config.ts`; it runs after a passing test
 * and after a failing one alike.
 */

import { afterEach } from "vitest";
import { unmountComponentRoot } from "../internal/test-root.js";

afterEach(unmountComponentRoot);
