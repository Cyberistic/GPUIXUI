import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  propertyRecord,
  setProperty,
  type PropertyRow,
} from "@gpuixui/files/property/logic";
import {
  LABEL_WIDTH,
  PANEL_ROWS,
  PropertyPanelFrame,
  numberValueOf,
  panelRecord,
  recordReadout,
  textValueOf,
  valueOf,
} from "./files-property-panel-demo";

/**
 * The Property panels preview for `@gpuixui/files`.
 *
 * `packages/files/docs/property-panel.mdx` is the package's Markdown, so the
 * site mounts this drawing from `package-preview.ts`. The page promises that
 * the panel owns no copy of its object and reports the whole record on every
 * edit; these cases hold the drawing to the package's `propertyRecord` and
 * `setProperty`, and to the object the two produce.
 */

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

/** The row a key names; the fixture's keys are fixed, so a miss is a bug. */
const row = (key: string): PropertyRow => {
  const found = PANEL_ROWS.find((candidate) => candidate.key === key);
  if (found === undefined) throw new Error(`no property row named ${key}`);
  return found;
};

const markup = (record = panelRecord()): string =>
  renderToStaticMarkup(
    <PropertyPanelFrame
      onChange={() => undefined}
      record={record}
      rows={PANEL_ROWS}
    />,
  );

describe("the files PropertyPanel preview", () => {
  it("starts from the record the package folds from its rows", () => {
    expect(panelRecord()).toEqual(propertyRecord(PANEL_ROWS));
    expect(panelRecord()).toEqual({
      name: "Sidebar",
      width: 240,
      visible: true,
      align: "left",
    });
  });

  it("paints one control per row type, from the record's own values", () => {
    const html = markup();

    expect(html).toContain('type="text"');
    expect(html).toContain('type="number"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("<select");
    expect(html.match(/<option /g)).toHaveLength(3);
    expect(html).toContain('value="Sidebar"');
    expect(html).toContain(`style="width:${LABEL_WIDTH}px"`);
  });

  it("repaints the object from the same record an edit returns", () => {
    const widened = setProperty(panelRecord(), "width", 320);
    const html = markup(widened);

    expect(numberValueOf(widened, row("width"))).toBe(320);
    expect(html).toContain('style="width:320px"');
    // The source record is untouched: the panel reports, it does not mutate.
    expect(panelRecord().width).toBe(240);

    const hidden = setProperty(widened, "visible", false);
    expect(markup(hidden)).toContain('data-visible="false"');
    expect(markup(hidden)).not.toContain('data-visible="true"');

    const centred = setProperty(hidden, "align", "center");
    expect(markup(centred)).toContain('data-align="center"');
    expect(textValueOf(centred, row("align"))).toBe("center");
  });

  it("reads every row through the record, so a missing key falls back to its row", () => {
    expect(valueOf(panelRecord(), row("name"))).toBe("Sidebar");
    expect(valueOf({}, row("width"))).toBe(240);
  });

  it("prints the whole record under the frame, key by key", () => {
    expect(recordReadout(panelRecord())).toBe(
      "align=left · name=Sidebar · visible=true · width=240",
    );
    expect(recordReadout(setProperty(panelRecord(), "name", "Inspector"))).toBe(
      "align=left · name=Inspector · visible=true · width=240",
    );
  });

  it("runs the package's record and edit rules instead of restating them", () => {
    const source = read(
      "apps/docs/src/components/docs/files-property-panel-demo.tsx",
    );

    expect(source).toContain('from "@gpuixui/files/property/logic"');
    expect(source).toContain("propertyRecord");
    expect(source).toContain("setProperty");
    expect(source).toContain("isTextRow");
    expect(source).toContain("isNumberRow");
    expect(source).toContain("isBooleanRow");
    expect(source).toContain("isSelectRow");
    // A local record builder would show up as a spread beside `setProperty`, and
    // a `switch` on the row type would duplicate the package's `Match`.
    expect(source).not.toContain("...record");
    expect(source).not.toContain("switch (");
  });
});
