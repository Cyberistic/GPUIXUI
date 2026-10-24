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

  /**
   * The bug this guards: the preference is a `MotionPreference` to the library
   * and a value from storage to the application — a settings row that is
   * `NULL`, a renamed setting, a checkbox column written as `"true"`. The
   * provider published whatever it was handed, so `useMotionPreference()` could
   * answer a value outside its own union and every surface's `=== "reduced"`
   * read false: a reader who asked for less motion got the journey, with
   * nothing to see.
   *
   * The prop is typed as the value the application holds — `unknown` — because
   * that is what a store hands back, and `preferenceOf` is the decoder. The old
   * `MotionPreference` prop refused the row in its type, so a consumer could
   * only pass its own stored value through an assertion.
   */
  it("publishes only a name the library carries", () => {
    // The rows below are what a store answered: a `string | null` and a value
    // typed as the setting an application keeps. Neither is a name the union
    // carries, and neither needs an assertion to reach the provider.
    const renamed: string | null = "Reduced";
    const neverStored: string | null = null;
    expect(
      markup(
        <Provider.MotionProvider preference={renamed}>
          <Preference />
        </Provider.MotionProvider>,
      ),
    ).toBe("reduced");
    // Absence is the house default, not the fail-safe: a config that never
    // carried the setting decodes to a nullish value.
    expect(
      markup(
        <Provider.MotionProvider preference={neverStored}>
          <Preference />
        </Provider.MotionProvider>,
      ),
    ).toBe("animated");
    // A row a decoder never saw at all (the shape `JSON.parse` leaves where a
    // key is missing) is the same absence, and a present non-name — a checkbox
    // column written as `"true"` — is the reduced policy.
    expect(
      markup(
        <Provider.MotionProvider preference={undefined}>
          <Preference />
        </Provider.MotionProvider>,
      ),
    ).toBe("animated");
    expect(
      markup(
        <Provider.MotionProvider preference={"true"}>
          <Preference />
        </Provider.MotionProvider>,
      ),
    ).toBe("reduced");
  });
});
