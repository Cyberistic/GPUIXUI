/**
 * The mount boundary: the one place in this example that executes anything.
 *
 * Everything above it is a React tree of `@gpuixui/primitives` components. The
 * window is owned by the GPUix runtime (`@gpuix/react`), which needs a native
 * binding — see `README.md` for the machine this can run on.
 */

import { render } from "@gpuix/react";
import { App } from "./App.js";

render(<App />, {
  title: "GPUIxUI — basic app",
  width: 960,
  height: 720,
});
