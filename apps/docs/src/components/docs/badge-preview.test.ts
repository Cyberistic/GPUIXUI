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

/**
 * The badge preview's model, held to the component and its recipe.
 *
 * The bug this guards: a preview that invents its own badge teaches a variant,
 * a size or a press rule the shipped component does not have. Every variant is
 * compiled through the component's own `BADGE_*` recipe, every size's height is
 * derived from that compilation, and the press route is read out of
 * `badge.tsx`, so a component change fails here before it reaches the page.
 *
 * `node:fs` is the test's own read of a checked-in file, not runtime I/O.
 */

const read = (path: string): string =>
  readFileSync(new URL(`../../../../../${path}`, import.meta.url), "utf8");

const component = read("packages/components/src/badge.tsx");
const behaviour = read("packages/components/src/behaviour/badge.test.tsx");
const page = read("apps/docs/content/docs/components/badge.mdx");
const css = read("apps/docs/src/styles/demos.css");

/** The declarations of the first `selector { … }` block in the style sheet. */
const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

/** `successSoft` → `success-soft`: the variable the docs bridge publishes. */
const kebab = (role: string): string =>
  role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** The classes the pill's own recipe compiles for a size and variant. */
const classesOf = (
  size: "sm" | "md",
  variant: keyof typeof BADGE_VARIANTS = "neutral",
): string => cn(BADGE_BASE, BADGE_SIZES[size], BADGE_VARIANTS[variant]);

/** The role a utility names: `bg-muted` → `muted`, `text-sm` is not a role. */
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

/** The style the recipe compiles: the authority for every printed number. */
const compiled = (
  size: "sm" | "md",
  variant: keyof typeof BADGE_VARIANTS = "neutral",
) => classesToStyle(classesOf(size, variant), lightTheme).style;

/** The height the renderer measures: the leading plus the `py-0.5` padding. */
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
    // Every filter the panel offers is a state it can show, or `all`.
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
    // The outline variant is the page's one *label*: a branch is not a state.
    expect(initialDeployments.map((row) => row.branch).length).toBe(6);
    expect(badgeVariants).toEqual(Object.keys(BADGE_VARIANTS));
  });
});

describe("the badge preview's press route", () => {
  it("leaves a press on the pill to its row, and nothing once the caller hands the pointer back", () => {
    // The measured routes: `list-row-press` reads `selected=badge` when the
    // press lands on the shipped pill, and `selected=none` on `badge-eager`.
    expect(pressTarget("status-pill")).toBe("row");
    expect(pressTarget("row")).toBe("row");
    expect(pressTarget("eager-pill")).toBe("none");
  });

  it("reads the declaration and the opt-back-in out of the component and its suite", () => {
    expect(component).toContain('{ pointerEvents: "none" }');
    expect(component).toContain("the caller's `style` below can hand it back");
    expect(component).toContain("style,");
    // The caller's style is merged after the refusal, which is why an eager
    // pill can exist at all.
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
    // The weight is the md step's, and only the md step's.
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
    // The measured defect: the divider role is ~1.00:1 on a row's accent wash,
    // so the one variant with no fill had no boundary under the pointer.
    const classes = classesOf("md", "outline");
    const decl = block(".gx-badge-outline");

    expect(classes).toContain("border-strong");
    expect(compiled("md", "outline").borderColor).toBe(
      lightTheme.colors.borderStrong,
    );
    expect(decl).toContain("border-color: var(--border-strong)");
    expect(decl).not.toContain("border-color: var(--border)");
    expect(decl).not.toContain("background");
    // The page prints the rule and the measured role, not only the class.
    expect(page).toContain("`borderStrong`");
    expect(page).toContain("~1.00:1");
  });
});

describe("the badge page", () => {
  it("teaches the two sizes and the pill's fixed metrics", () => {
    expect(page).toContain("12/16");
    expect(page).toContain("14/20");
    expect(page).toContain(`${pillHeight("sm")}px`);
    expect(page).toContain(`${pillHeight("md")}px`);
    expect(page).toContain("20px");
    expect(page).toContain("24px");
  });

  it("marks the page as a browser rendering of a native pill", () => {
    expect(page).toContain("<ComponentPreview");
    expect(page).toContain("browser rendering");
    expect(page).toContain("@gpuix/native@0.11.0");
  });
});
