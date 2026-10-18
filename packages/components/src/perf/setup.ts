/**
 * The perf suite renders through the same one-window native root as the
 * behaviour suite, so it needs the same teardown (plan 326).
 */

import { afterEach } from "vitest";
import { unmountComponentRoot } from "../internal/test-root.js";

afterEach(unmountComponentRoot);
