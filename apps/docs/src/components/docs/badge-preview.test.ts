import { readFileSync } from "node:fs";
import { lightTheme } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import {
  BADGE_BASE,
  BADGE_SIZES,
  BADGE_VARIANTS,
  classesToStyle,
  cn,
} from "../../../../../packages/tw/src/index";
import {
  badgeSizes,
  badgeVariantFor,
  badgeVariants,
  deploymentFilters,
  deploymentStatuses,
  describeDeployments,
  initialDeployments,
  pressTarget,
  statusCounts,
  statusText,
  visibleDeployments,
} from "./badge-preview";

const read = (path: string): string =>
  readFileSync(new URL(`../../../../../${path}`, import.meta.url), "utf8");

const component = read("packages/components/src/badge.tsx");
const behaviour = read("packages/components/src/behaviour/badge.test.tsx");
const css = read("apps/docs/src/styles/demos.css");

const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

const kebab = (role: string): string =>
  role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const classesOf = (
  size: "sm" | "md",
  variant: keyof typeof BADGE_VARIANTS = "neutral",
): string => cn(BADGE_BASE, BADGE_SIZES[size], BADGE_VARIANTS[variant]);

const declaredRole = (
  className: string,
  prefix: "bg" | "text" | "border",
): string => {
  const candidates = [
    ...className.matchAll(
      new RegExp(`(?:^| )${prefix}-([A-Za-z]+)(?=[ /]|$)`, "g"),
    ),
  ].map((match) => match[1] ?? "");

  return candidates.find((role) => role in lightTheme.colors) ?? "";
};

const compiled = (
  size: "sm" | "md",
  variant: keyof typeof BADGE_VARIANTS = "neutral",
) => classesToStyle(classesOf(size, variant), lightTheme).style;

const pillHeight = (size: "sm" | "md"): number => {
  const style = compiled(size);
  return (style.lineHeight ?? 0) + (style.paddingTop ?? 0) * 2;
};

describe("the badge preview's deployments", () => {
  it("opens with a row in every state, and a second failure to filter on", () => {
    expect(initialDeployments).toHaveLength(6);
    expect(statusCounts(initialDeployments)).toEqual({
      passed: 1,
      failed: 2,
      running: 1,
      queued: 1,
      stale: 1,
    });
    expect(deploymentStatuses.map(statusText)).toEqual([
      "Passed",
      "Failed",
      "Running",
      "Queued",
      "Stale",
    ]);
    expect(describeDeployments(initialDeployments)).toBe(
      "6 deployments · 1 passed, 2 failed, 1 running, 1 queued, 1 stale",
    );
  });

  it("narrows the rows under a filter and never adds one", () => {
    const failed = visibleDeployments(initialDeployments, "failed");

    expect(failed.map((row) => row.id)).toEqual(["web", "billing"]);
    expect(failed.every((row) => initialDeployments.includes(row))).toBe(true);
    expect(visibleDeployments(initialDeployments, "all")).toBe(
      initialDeployments,
    );

    const counts = statusCounts(initialDeployments);
    expect(
      deploymentFilters.filter(
        (filter) => filter !== "all" && counts[filter] === 0,
      ),
    ).toEqual([]);
  });

  it("draws every state with a filled variant and never the outline label", () => {
    const painted = deploymentStatuses.map(badgeVariantFor);

    expect(new Set(painted).size).toBe(deploymentStatuses.length);
    expect(painted).not.toContain("outline");
    expect(painted.every((variant) => variant in BADGE_VARIANTS)).toBe(true);

    expect(initialDeployments.map((row) => row.branch).length).toBe(6);
    expect(badgeVariants).toEqual(Object.keys(BADGE_VARIANTS));
  });
});

describe("the badge preview's press route", () => {
  it("leaves a press on the pill to its row, and nothing once the caller hands the pointer back", () => {
    expect(pressTarget("status-pill")).toBe("row");
    expect(pressTarget("row")).toBe("row");
    expect(pressTarget("eager-pill")).toBe("none");
  });

  it("reads the declaration and the opt-back-in out of the component and its suite", () => {
    expect(component).toContain('{ pointerEvents: "none" }');
    expect(component).toContain("style,");

    const refusal = component.indexOf('{ pointerEvents: "none" }');
    const caller = component.lastIndexOf("style,", component.indexOf("};"));
    expect(caller).toBeGreaterThan(refusal);
    expect(behaviour).toContain('style={{ pointerEvents: "auto" }}');
  });

  it("declares the preview's pill out of the pointer, and the eager control back in", () => {
    expect(block(".gx-badge")).toContain("pointer-events: none");
    expect(block(".gx-badge[data-eager]")).toContain("pointer-events: auto");
  });
});

describe("the badge preview's geometry and palette", () => {
  it("sizes both pills by the step the recipe compiles", () => {
    expect(pillHeight("sm")).toBe(20);
    expect(pillHeight("md")).toBe(24);
    expect(block(".gx-badge-sm")).toContain("height: 20px");
    expect(block(".gx-badge-md")).toContain("height: 24px");
    expect(block(".gx-badge-sm")).toContain("font-size: 12px");
    expect(block(".gx-badge-md")).toContain("font-size: 14px");

    expect(block(".gx-badge-md")).toContain("font-weight: 500");
    expect(block(".gx-badge-sm")).not.toContain("font-weight");
    expect(badgeSizes).toEqual(["sm", "md"]);
  });

  it("paints every variant from the role its recipe names", () => {
    const drift = badgeVariants.flatMap((variant) => {
      const classes = classesOf("md", variant);
      const decl = block(`.gx-badge-${variant}`);
      const fill = kebab(declaredRole(classes, "bg"));
      const ink = kebab(declaredRole(classes, "text"));

      return [
        decl === "" ? `${variant}: no rule in demos.css` : "",
        fill === "" || decl.includes(`background: var(--${fill})`)
          ? ""
          : `${variant}: fill is not ${fill}`,
        ink === "" || decl.includes(`color: var(--${ink})`)
          ? ""
          : `${variant}: ink is not ${ink}`,
      ].filter((gap) => gap !== "");
    });

    expect(drift).toEqual([]);
  });

  it("draws the soft variants' edge at the share the recipe compiles", () => {
    const drifted = (["success", "warning", "danger", "info"] as const).filter(
      (variant) => {
        const classes = classesOf("md", variant);
        const edge = kebab(declaredRole(classes, "border"));

        return (
          edge === "" ||
          !block(`.gx-badge-${variant}`).includes(
            `color-mix(in srgb, var(--${edge}) 30%, transparent)`,
          )
        );
      },
    );

    expect(drifted).toEqual([]);
  });

  it("keeps the outline's edge on the boundary role, not the divider", () => {
    const classes = classesOf("md", "outline");
    const decl = block(".gx-badge-outline");

    expect(classes).toContain("border-strong");
    expect(compiled("md", "outline").borderColor).toBe(
      lightTheme.colors.borderStrong,
    );
    expect(decl).toContain("border-color: var(--border-strong)");
    expect(decl).not.toContain("border-color: var(--border)");
    expect(decl).not.toContain("background");
  });
});
