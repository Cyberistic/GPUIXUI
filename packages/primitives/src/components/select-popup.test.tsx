import { lightTheme, platformTheme } from "@gpuixui/tokens";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { buttonVariants } from "../core/variants.js";
import {
  SelectIndicator,
  selectTriggerStyle,
  type SelectTriggerState,
} from "./Select.js";

const mac = platformTheme(lightTheme, "darwin");

const props = (element: ReactElement | null) =>
  (element?.props ?? {}) as Record<string, unknown>;

describe("the select trigger", () => {
  it("ends in a down chevron on the web", () => {
    expect(props(SelectIndicator({ theme: lightTheme }))["name"]).toBe(
      "chevron-down",
    );
  });

  it("ends in AppKit's up/down capsule on macOS", () => {
    const capsule = SelectIndicator({ theme: mac });
    expect(
      (props(capsule)["style"] as Record<string, unknown>)["backgroundColor"],
    ).toBe(mac.colors.primary);
    const glyph = props(capsule)["children"] as ReactElement;
    expect(props(glyph)["name"]).toBe("chevrons-up-down");
  });

  it("wears a raised face on macOS and the field's fill on the web", () => {
    const spec = { variant: buttonVariants.outline, size: "md" } as const;
    const state: SelectTriggerState = {
      open: false,
      disabled: false,
      placeholder: false,
    };
    expect(selectTriggerStyle(spec, mac)(state).backgroundColor).toBe(
      mac.colors.card,
    );
    expect(selectTriggerStyle(spec, lightTheme)(state).backgroundColor).toBe(
      lightTheme.colors.input,
    );
  });
});
