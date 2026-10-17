import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { lightTheme, platformTheme, type Theme } from "@gpuixui/tokens";
import { bySlug } from "@/component-meta/registry";
import { APPROXIMATION_NOTICE } from "./approximation-banner";
import { previewsBySlug } from "./approximations";
import { ComponentPreview } from "./component-preview";

/**
 * Guards the tier-A preview contract (plan 412, plan 434). The load-bearing
 * failures are an unlabelled approximation, a preview of a component that does
 * not exist, and a preview that stops reading the active theme so the platform
 * toggle silently does nothing.
 */

const previews = [...previewsBySlug.entries()];

const rendered = (slug: string, platform: "darwin" | "win32"): string =>
  renderToStaticMarkup(
    <ComponentPreviewWithTheme
      slug={slug}
      theme={platformTheme(lightTheme, platform)}
    />,
  );

function ComponentPreviewWithTheme({
  slug,
  theme,
}: {
  readonly slug: string;
  readonly theme: Theme;
}) {
  const Preview = previewsBySlug.get(slug);
  return Preview === undefined ? null : <Preview theme={theme} />;
}

describe("tier-A previews", () => {
  it("are all labelled as browser approximations", () => {
    previews.forEach(([slug]) => {
      expect(
        renderToStaticMarkup(<ComponentPreview slug={slug} />),
        slug,
      ).toContain(APPROXIMATION_NOTICE);
    });
  });

  it("only preview components the registry knows", () => {
    expect(
      previews.map(([slug]) => slug).filter((slug) => !bySlug.has(slug)),
    ).toEqual([]);
  });

  it("render nothing for a component with no preview", () => {
    expect(renderToStaticMarkup(<ComponentPreview slug="icon" />)).toBe("");
  });

  it("never present an interaction as native behaviour", () => {
    previews.forEach(([slug]) => {
      const html = rendered(slug, "darwin");
      expect(html, slug).not.toMatch(
        /onclick|tabindex|role="button"|<input|<button/,
      );
    });
  });

  it("re-render every preview when the platform theme changes", () => {
    previews.forEach(([slug]) => {
      const darwin = rendered(slug, "darwin").match(
        /--preview-font-mono:([^;"]+)/,
      )?.[1];
      const win32 = rendered(slug, "win32").match(
        /--preview-font-mono:([^;"]+)/,
      )?.[1];
      expect(darwin, slug).toBe("Menlo");
      expect(win32, slug).toBe("Consolas");
    });
  });
});

/**
 * The states each preview exists to show (plan 449). A preview that quietly
 * drops the invalid field, the indeterminate checkbox or a badge variant still
 * renders and still passes every other guard, so the documented state is pinned
 * to the markup here.
 */
const documentedStates: ReadonlyArray<readonly [string, readonly string[]]> = [
  [
    "text-input",
    [
      "Workspace name",
      "Use lowercase letters, numbers and dashes.",
      "Managed by your organisation",
    ],
  ],
  [
    "checkbox",
    ["Email notifications", "Weekly digest", "Select all", "Locked by policy"],
  ],
  ["switch", ["Sync automatically", "Ask before deleting"]],
  ["slider", ["Minimum", "Halfway", "Maximum"]],
  [
    "badge",
    ["Neutral", "Primary", "Success", "Warning", "Danger", "Info", "Outline"],
  ],
  ["alert", ["Workspace archived", "Members keep read access"]],
  ["progress", ["Uploading", "Indexing", "25%", "60%"]],
  [
    "avatar",
    ["Ada Lovelace", "Jean Sammet", "Margaret Hamilton", "Radia Perlman"],
  ],
  [
    "text-area",
    [
      "Release notes",
      "Use lowercase letters, numbers and dashes.",
      "Managed by your organisation",
    ],
  ],
  ["radio-group", ["Digest cadence", "Daily", "Weekly", "Never"]],
  ["select", ["Region", "Europe — West", "legacy region"]],
  ["range-slider", ["Budget", "$20 – $80"]],
  [
    "meter",
    [
      "Disk usage · 68 of 100 GB",
      "Memory · 42 of 64 GB",
      "Quota · 96 of 100 GB",
    ],
  ],
  ["number-field", ["Copies", "1–99", "Retries", "Must be between 1 and 99."]],
  ["otp-field", ["Verification code", "Six digits from your authenticator."]],
  ["toggle", ["Pin to sidebar", "Show grid", "Bold", "Italic"]],
  ["rating", ["4 of 5", "No rating yet"]],
  ["list", ["Projects", "Design system", "Documentation site", "Onboarding"]],
  ["empty-state", ["No projects yet", "Create project", "Browse templates"]],
  ["inline-validation", ["Workspace name", "Enter a complete email address."]],
  ["breadcrumb", ["Workspace", "Settings", "Members"]],
  ["pagination", ["…", "The window keeps a stable width"]],
  [
    "search-input",
    ["Search", "button", "Escape clears only when the field is not empty."],
  ],
  [
    "accordion",
    ["Notifications", "Billing", "Email me when a deployment finishes."],
  ],
  ["collapsible", ["Advanced settings", "unmounts while closed"]],
  ["text", ["GPUIXUI", "Design system", "const theme = createTheme("]],
  ["separator", ["Appearance", "A horizontal rule separates sections."]],
  ["spacer", ["Start", "End", "The spacer is the flexible gap"]],
  ["stack", ["Column · one", "Row · one"]],
  ["box", ["Nested surface", "Padding, border and radius"]],
  ["button-group", ["Day", "Week", "Month", "Attached children are 0px apart"]],
  [
    "label",
    [
      "Workspace name",
      "Required before the form can be saved.",
      "Legacy field",
    ],
  ],
];

describe("preview state coverage", () => {
  it("shows every state its component page documents", () => {
    documentedStates.forEach(([slug, phrases]) => {
      const html = rendered(slug, "darwin");
      phrases.forEach((phrase) =>
        expect(html, `${slug}: ${phrase}`).toContain(phrase),
      );
    });
  });
});
