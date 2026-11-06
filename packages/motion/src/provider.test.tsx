import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import * as Provider from "./provider.js";
import * as ReactEntry from "./react.js";

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
    expect(ReactEntry.MotionProvider).toBe(Provider.MotionProvider);
    expect(ReactEntry.useMotionPreference).toBe(Provider.useMotionPreference);
  });

  it("publishes only a name the library carries", () => {
    const renamed: string | null = "Reduced";
    const neverStored: string | null = null;
    expect(
      markup(
        <Provider.MotionProvider preference={renamed}>
          <Preference />
        </Provider.MotionProvider>,
      ),
    ).toBe("reduced");

    expect(
      markup(
        <Provider.MotionProvider preference={neverStored}>
          <Preference />
        </Provider.MotionProvider>,
      ),
    ).toBe("animated");

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
