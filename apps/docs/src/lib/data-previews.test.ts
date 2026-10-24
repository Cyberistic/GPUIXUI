import { readFileSync } from "node:fs";
import { DEFAULT_LABEL_WIDTH } from "@gpuixui/data";
import { describe, expect, it } from "vitest";
import { expected, previewPages } from "../../scripts/data-previews-probe";
import {
  LISTED_FILES,
  OPEN_ON_MOUNT,
  toggleOpen,
} from "../components/docs/expandable-rows-demo";
import { FROZEN_RECORDS } from "../components/docs/frozen-columns-demo";
import {
  LABEL_WIDTHS,
  UNUSABLE_CHOICE,
  WIDE_CHOICE,
} from "../components/docs/key-value-demo";
import { QUEUE_ROWS, matchingRows } from "../components/docs/data-toolbar-demo";
import { packagePreviews } from "./package-preview";

/**
 * The probe that presses the data lane's four drawings.
 *
 * `data-previews-probe.ts` is a browser run, not part of `nub run test`: it
 * needs a served build and Chrome. What a unit test can hold is the other half
 * — that the numbers it expects are the drawings' own (a record added to a
 * table asks the probe to expect it) and that the selectors it presses are the
 * classes the modules render, so a rename cannot leave the probe reading a
 * missing node and calling it a pass.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

/** The path a package collection mounts, for the page a probe scenario names. */
const mounted = (path: string): boolean =>
  packagePreviews.some(
    (row) =>
      row.origin === "data" &&
      `/docs/data-display/${row.path.replace(/\.mdx$/, "")}` === path,
  );

describe("the data previews probe", () => {
  it("expects the counts its drawings actually paint", () => {
    expect(expected.expandableRows).toBe(LISTED_FILES.length);
    expect(expected.openOnMount).toBe(OPEN_ON_MOUNT.length);
    expect(expected.openAfterPress).toBe(
      toggleOpen(OPEN_ON_MOUNT, "notes").length,
    );
    expect(expected.toolbarRows).toBe(QUEUE_ROWS.length);
    expect(expected.toolbarMatches).toBe(matchingRows("staging").length);
    expect(expected.frozenRows).toBe(FROZEN_RECORDS.length);
    expect(expected.labelWidth).toBe(DEFAULT_LABEL_WIDTH);
    expect(expected.wideLabelWidth).toBe(WIDE_CHOICE.width);
    // The unreadable width is the one the second key-value press picks.
    expect(Number.isNaN(UNUSABLE_CHOICE.width)).toBe(true);
    expect(LABEL_WIDTHS.map((choice) => choice.width)).toEqual([
      expected.labelWidth,
      expected.wideLabelWidth,
      Number.NaN,
    ]);
  });

  it("visits a page the preview table mounts, one per scenario", () => {
    const pages = Object.values(previewPages);

    expect(pages).toHaveLength(4);
    expect(pages.filter((page) => !mounted(page))).toEqual([]);
  });

  it("presses the selectors its drawings render", () => {
    // A renamed class is a probe that reads `undefined` and a failed hand run,
    // not a passing one; the modules are the source of the names.
    const modules = {
      expandable: read(
        "apps/docs/src/components/docs/expandable-rows-demo.tsx",
      ),
      toolbar: read("apps/docs/src/components/docs/data-toolbar-demo.tsx"),
      frozen: read("apps/docs/src/components/docs/frozen-columns-demo.tsx"),
      keyValue: read("apps/docs/src/components/docs/key-value-demo.tsx"),
    };

    expect(modules.expandable).toContain('className="gx-er-row"');
    expect(modules.expandable).toContain("aria-expanded={expanded}");
    expect(modules.toolbar).toContain('className="gx-toolbar"');
    expect(modules.toolbar).toContain('type="search"');
    expect(modules.toolbar).toContain('className="gx-toolbar-row"');
    expect(modules.frozen).toContain('data-pane="frozen"');
    expect(modules.frozen).toContain('data-pane="data"');
    expect(modules.frozen).toContain('className="gx-fc-body"');
    expect(modules.keyValue).toContain('className="gx-kv-label"');

    // Both choice groups share the one chip, which the probe presses by label.
    expect(modules.keyValue).toContain('className="gx-demo-choice"');
    expect(modules.frozen).toContain('className="gx-demo-choice"');
  });

  it("records the press it measured, and the race it waits out", () => {
    const policy = read("docs/preview-strategy.md").replace(/\s+/g, " ");

    expect(policy).toContain("nub apps/docs/scripts/data-previews-probe.ts");
    expect(policy).toContain("2 of 4 panels open");
    expect(policy).toContain("3 of 6 rows");
    expect(policy).toContain("frozen:72,0 | data:72,0");
    // The precondition the run found: props exist before the listeners.
    expect(policy).toContain(
      "a node's `__reactProps` exist **before** the commit that attaches its listeners",
    );

    const probe = read("apps/docs/scripts/data-previews-probe.ts");
    expect(probe).toContain("setTimeout(wait, 300)");
  });
});
