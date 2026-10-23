/**
 * The preference the whole library reads.
 *
 * The bug this guards: the reduced-motion preference lived in
 * `@gpuixui/components`, so the package that owns the timing could not state it
 * and every other package had to thread its own boolean — a tree wrapped in one
 * `MotionProvider` still animated the primitives' controls, which take
 * `reducedMotion` as a prop. The context belongs to the package that owns the
 * policy, so a second copy (in a component package, or in this entry beside the
 * re-export) cannot quietly answer a different preference.
 *
 * `renderToStaticMarkup` is the whole render a provider has: it reads no effect,
 * which is the point — the preference is a value a surface reads during render.
 */

import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import * as Provider from "./provider.js";
import * as ReactEntry from "./react.js";

/** The preference the tree states, as a surface below it would read it. */
const Preference = () => <>{Provider.useMotionPreference()}</>;

const markup = (element: ReactElement): string => renderToStaticMarkup(element);

describe("the motion preference", () => {
  it("is animated for a tree that states none", () => {
    expect(markup(<Preference />)).toBe("animated");
  });

  it("is the value the nearest provider supplies", () => {
    expect(
      markup(
        <Provider.MotionProvider preference="reduced">
          <Preference />
        </Provider.MotionProvider>,
      ),
    ).toBe("reduced");
    // A provider below another one is the policy for its own subtree: an
    // application that reduces motion may still show an animated preview.
    expect(
      markup(
        <Provider.MotionProvider preference="reduced">
          <Provider.MotionProvider preference="animated">
            <Preference />
          </Provider.MotionProvider>
        </Provider.MotionProvider>,
      ),
    ).toBe("animated");
  });

  it("is the same context the React entry publishes", () => {
    // A copy is the failure this names: the entry re-exports the provider, so a
    // second context — one provider a hook never reads — fails here by identity.
    expect(ReactEntry.MotionProvider).toBe(Provider.MotionProvider);
    expect(ReactEntry.useMotionPreference).toBe(Provider.useMotionPreference);
  });
});
