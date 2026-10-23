import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { blocks } from "./blocks";
import {
  DashboardManagementRender,
  DashboardManagementView,
  cancelUpload,
  clearCopy,
  copyKey,
  dismissToast,
  initialDashboardManagementState,
  resumeUpload,
  selectBuild,
  selectRuntime,
} from "./dashboard-management";

/**
 * The dashboard-management block.
 *
 * The preview is a browser reproduction, but every card a reader is told to
 * look for has to reach the markup, and every control's state has to be the one
 * the state helpers produce. A section dropped from the view, a radio that
 * never changes its `aria-checked`, or a dismissed toast that stays on screen
 * would leave the block teaching a console it does not draw.
 */

const here = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const text = (markup: string): string =>
  markup
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&");

const view = (state = initialDashboardManagementState): string =>
  renderToStaticMarkup(<DashboardManagementView state={state} />);

const checked = (markup: string, runtime: string): boolean => {
  const match = new RegExp(
    `aria-checked="(true|false)"[^>]*data-runtime="${runtime}"`,
  ).exec(markup);
  return match?.[1] === "true";
};

const copyLabel = (markup: string, key: string): string | undefined =>
  new RegExp(
    `<button[^>]*aria-label="Copy the ${key} key"[^>]*>([^<]*)</button>`,
  ).exec(markup)?.[1];

const selected = (markup: string, build: string): boolean => {
  const match = new RegExp(
    `aria-selected="(true|false)"[^>]*data-build="${build}"`,
  ).exec(markup);
  return match?.[1] === "true";
};

describe("the dashboard management preview", () => {
  const markup = view();

  it("prints every card of the three columns", () => {
    const cards = [
      "atlas-edge · production",
      "Command palette",
      "TypeError at line 42 of main.ts: Missing env DATABASE_URL",
      "Upload · dataset.parquet",
      "Compute environment",
      "Deployment succeeded",
      "Rate limit approaching",
      "Recent deployments",
      "Debug prod deploy failure",
      "Popover · context menu",
      "All clear",
      "API keys",
    ];

    expect(markup.match(/class="gx-mgmt-card/g)?.length).toBeGreaterThanOrEqual(
      9,
    );
    expect(cards.filter((card) => !text(markup).includes(card))).toEqual([]);
  });

  it("prints the service stats and the deploy table's states", () => {
    for (const value of ["12,847", "421ms", "12", "99.98%"]) {
      expect(markup).toContain(value);
    }
    for (const build of ["a9f3b1", "cc02ae", "7d21ee", "4b11cd"]) {
      expect(markup).toContain(build);
    }
    expect(markup).toContain("gx-badge-warning");
    expect(markup).toContain("gx-badge-danger");
  });

  it("starts on Kubernetes and moves the dot with the choice", () => {
    expect(checked(markup, "kubernetes")).toBe(true);
    expect(checked(markup, "vm")).toBe(false);

    const moved = view(selectRuntime(initialDashboardManagementState, "vm"));
    expect(checked(moved, "kubernetes")).toBe(false);
    expect(checked(moved, "vm")).toBe(true);
  });

  it("reserves the toast stack when a toast is dismissed", () => {
    const one = view(dismissToast(initialDashboardManagementState, "deploy"));
    expect(text(one)).not.toContain("Deployment succeeded");
    expect(text(one)).toContain("Rate limit approaching");
    expect(one).toContain("gx-mgmt-toasts");

    const none = view(
      dismissToast(
        dismissToast(initialDashboardManagementState, "deploy"),
        "quota",
      ),
    );
    expect(text(none)).toContain("No new notifications");
    expect(none).not.toContain("gx-toast-card");
  });

  it("acknowledges one key at a time and clears it", () => {
    expect(copyLabel(markup, "production")).toBe("Copy");

    const copied = view(copyKey(initialDashboardManagementState, "staging"));
    expect(copyLabel(copied, "staging")).toBe("Copied");
    expect(copyLabel(copied, "production")).toBe("Copy");

    const cleared = view(
      clearCopy(copyKey(initialDashboardManagementState, "staging")),
    );
    expect(copyLabel(cleared, "staging")).toBe("Copy");
  });

  it("selects a deployment row, and only that row", () => {
    expect(selected(markup, "7d21ee")).toBe(false);

    const chosen = view(selectBuild(initialDashboardManagementState, "7d21ee"));
    expect(selected(chosen, "7d21ee")).toBe(true);
    expect(selected(chosen, "a9f3b1")).toBe(false);
  });

  it("turns a cancelled upload into a resumable row", () => {
    const cancelled = view(cancelUpload(initialDashboardManagementState));
    expect(text(cancelled)).toContain("Upload cancelled · dataset.parquet");
    expect(text(cancelled)).toContain("Cancelled");
    expect(text(cancelled)).toContain("Resume");
    expect(cancelled).toContain("width:0%");

    expect(
      text(view(resumeUpload(cancelUpload(initialDashboardManagementState)))),
    ).toContain("Chunked multipart upload in progress");
  });

  it("mounts through the registry's render", () => {
    expect(renderToStaticMarkup(<DashboardManagementRender />)).toContain(
      "atlas-edge · production",
    );
  });
});

describe("the dashboard management state", () => {
  it("keeps every transition in one record", () => {
    const state = initialDashboardManagementState;

    expect(selectRuntime(state, "vm").runtime).toBe("vm");
    expect(dismissToast(state, "deploy").dismissedToasts).toEqual(["deploy"]);
    expect(copyKey(state, "staging").copiedKey).toBe("staging");
    expect(clearCopy(copyKey(state, "staging")).copiedKey).toBeNull();
    expect(selectBuild(state, "cc02ae").selectedBuild).toBe("cc02ae");
    expect(cancelUpload(state).upload).toBe("cancelled");
    expect(resumeUpload(cancelUpload(state)).upload).toBe("uploading");
    // A transition never mutates the record it was handed.
    expect(state).toEqual(initialDashboardManagementState);
  });
});

describe("the block registration", () => {
  const block = blocks["dashboard-management-01"];

  it("registers the slug, packages, render and source", () => {
    expect(block).toBeDefined();
    expect(block?.slug).toBe("dashboard-management");
    expect(block?.packages).toContain("@gpuixui/data");
    expect(block?.render).toBe(DashboardManagementRender);
    expect(block?.source).toContain("Compute environment");
    expect(block?.source).toContain("CopyButton");
  });

  it("mounts the registry key in the page and lists it in the sidebar", () => {
    const page = here("../../../content/docs/blocks/dashboard-management.mdx");
    const meta: unknown = JSON.parse(
      here("../../../content/docs/blocks/meta.json"),
    );
    const pages =
      typeof meta === "object" && meta !== null && "pages" in meta
        ? meta.pages
        : undefined;

    expect(page).toContain('<BlockPreview name="dashboard-management-01" />');
    expect(Array.isArray(pages) && pages.includes("dashboard-management")).toBe(
      true,
    );
    expect(here("../../../README.md")).toContain(
      "blocks/dashboard-management.mdx",
    );
  });
});

describe("the management layout", () => {
  const css = here("../../styles/blocks.css");
  const section = css.slice(
    css.indexOf("---- dashboard management ----"),
    css.indexOf("/* ---- index cards ---- */"),
  );

  it("folds three columns to two and then one", () => {
    expect(section).toContain(
      "grid-template-columns: repeat(3, minmax(0, 1fr))",
    );
    expect(section).toMatch(
      /@media \(max-width: 1200px\)[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/,
    );
    expect(section).toMatch(
      /@media \(max-width: 760px\)[\s\S]*grid-template-columns: 1fr/,
    );
  });

  it("paints from theme roles only", () => {
    expect(section).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba?\(/);
    expect(section).toContain("var(--destructive-soft)");
    expect(section).toContain("var(--success)");
    // The upload's description holds two lines in both states, so cancelling
    // cannot change the card's height.
    expect(section).toContain(".gx-mgmt-upload .gx-mgmt-desc");
    expect(section).toContain("min-height: 2.9em");
  });
});
