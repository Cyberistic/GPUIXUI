/**
 * Guards the extension registry.
 *
 * Bug guarded: adding a utility, variant, alias or unsupported reason meant
 * editing `classesToStyle` itself, so `@gpuixui/tw` could not be extended by a
 * consumer. Each test also checks the default registry did not gain the
 * extension, so a passing suite cannot be an accident of the default table.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import { lightTheme } from "@gpuixui/tokens";
import { classesToStyle, createTw } from "./classes.js";
import {
  createTwRegistry,
  defaultRegistry,
  type TwVariantResolver,
} from "./registry.js";

describe("custom utilities", () => {
  it("resolves an exact utility from a custom registry", () => {
    const registry = createTwRegistry({
      utilities: { "h-card": () => ({ height: 44 }) },
    });

    expect(classesToStyle("h-card", lightTheme, registry).style.height).toBe(
      44,
    );
    expect(classesToStyle("h-card", lightTheme).unsupported).toContain(
      "h-card",
    );
  });

  it("passes the suffix of a family utility as its value", () => {
    const registry = createTwRegistry({
      utilities: {
        tone: (_theme, value) =>
          value === undefined ? undefined : { opacity: Number(value) / 100 },
      },
    });

    expect(classesToStyle("tone-40", lightTheme, registry).style.opacity).toBe(
      0.4,
    );
    expect(classesToStyle("tone-40", lightTheme).unsupported).toContain(
      "tone-40",
    );
  });
});

describe("custom variants", () => {
  const expandedVariant: TwVariantResolver = (variants, state) =>
    Arr.some(variants, (variant) => variant === "when-expanded") &&
    state.expanded === true
      ? "open"
      : undefined;

  it("routes a custom variant into the bucket it returns", () => {
    const registry = createTwRegistry({ variants: [expandedVariant] });
    const result = classesToStyle(
      "when-expanded:bg-muted",
      lightTheme,
      registry,
      {
        expanded: true,
      },
    );

    expect(result.open.backgroundColor).toBe(lightTheme.colors.muted);
    expect(result.unsupported).not.toContain("when-expanded:bg-muted");
  });

  it("leaves the variant unsupported without the registry", () => {
    expect(
      classesToStyle("when-expanded:bg-muted", lightTheme, defaultRegistry, {
        expanded: true,
      }).unsupported,
    ).toContain("when-expanded:bg-muted");
  });
});

describe("recipe aliases", () => {
  it("expands an alias before class resolution", () => {
    const registry = createTwRegistry({
      aliases: { "cn-card": "rounded-lg border bg-card" },
    });
    const result = classesToStyle("cn-card", lightTheme, registry);

    expect(result.style.borderRadius).toBe(8);
    expect(result.style.borderWidth).toBe(1);
    expect(result.style.backgroundColor).toBe(lightTheme.colors.card);
    expect(classesToStyle("cn-card", lightTheme).unsupported).toContain(
      "cn-card",
    );
  });

  it("keeps the caller's utility when it conflicts with the alias", () => {
    const registry = createTwRegistry({
      aliases: { "cn-card": "rounded-lg border bg-card" },
    });

    expect(
      classesToStyle("cn-card rounded-full", lightTheme, registry).style
        .borderRadius,
    ).toBe(9999);
    expect(
      classesToStyle("cn-card hover:bg-accent", lightTheme, registry).style
        .hover?.backgroundColor,
    ).toBe(lightTheme.colors.accent);
  });
});

describe("unsupported reasons", () => {
  it("lets a consumer override a resolvable utility's classification", () => {
    const tw = createTw({
      unsupported: {
        "bg-card": "Card surfaces are painted by the panel host.",
      },
    });
    const result = tw.classesToStyle("bg-card", lightTheme);

    expect(result.style.backgroundColor).toBeUndefined();
    expect(result.unsupported).toContain("bg-card");
    expect(tw.unsupportedReason("bg-card")).toBe(
      "Card surfaces are painted by the panel host.",
    );
    expect(classesToStyle("bg-card", lightTheme).style.backgroundColor).toBe(
      lightTheme.colors.card,
    );
  });

  it("names the transform and grid gaps through the public reason", () => {
    const tw = createTw();
    expect(tw.unsupportedReason("rotate-45")).toContain("@gpuixui/motion");
    expect(tw.unsupportedReason("col-span-2")).toContain("span");
    expect(tw.unsupportedReason("grid-area-header")).toContain("named areas");
  });
});

describe("createTw", () => {
  it("binds every extension to one registry", () => {
    const tw = createTw({
      utilities: { "h-card": () => ({ height: 44 }) },
      aliases: { "cn-card": "h-card rounded-lg" },
    });

    expect(tw.registry).not.toBe(defaultRegistry);
    expect(tw.classesToStyle("cn-card", lightTheme).style.height).toBe(44);
    expect(tw.classesToStyle("cn-card", lightTheme).style.borderRadius).toBe(8);
  });
});
