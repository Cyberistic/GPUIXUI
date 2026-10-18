/**
 * The examples, mounted in the real GPUix renderer.
 *
 * The bug these guard: an example is the code a consumer copies, but until this
 * suite existed nothing ever rendered one — `tsc` proved the syntax and the
 * inventory proved the file existed, while a misplaced part (`assertParts`
 * throws at render), an invalid prop or a provider that needs a context could
 * break every copy silently. The registry is the source of the list, so an
 * example added to `examples/index.ts` is covered without editing this file.
 *
 * The per-component contracts belong to the other behaviour suites; here the
 * assertion is deliberately minimal — every registered example mounts and paints.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import type { ComponentType } from "react";
import { describe, expect, it } from "vitest";
import { examples } from "../../examples/index.js";
import { renderComponent } from "../internal/test-root.js";

describe("examples", () => {
  it("mounts every registered example and paints text", () => {
    const root = renderComponent(<div />);

    Arr.forEach(R.keys(examples), (id) => {
      const Example: ComponentType = Option.getOrElse(
        Option.fromNullishOr(examples[id]),
        () => expect.fail(`the example registry has no "${id}" entry`),
      );
      root.rerender(<Example key={id} />);
      expect(Arr.length(root.renderer.getAllText()), id).toBeGreaterThan(0);
    });

    root.unmount();
  });
});
