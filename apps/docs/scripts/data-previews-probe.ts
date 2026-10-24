/**
 * Measure the data lane's four pressing drawings in a hydrated page.
 *
 * The four previews added to `/docs/data-display` are *interactions* — a row
 * that opens a panel, a field that reports a debounced query, two panes
 * mirrored through one offset, and a label column that falls back when a width
 * cannot paint. Their unit guards prove the rules; a server-rendered read
 * proves the markup. Neither proves the React handler is attached, so this
 * probe presses each control in a real browser and reads the consequence off
 * the drawing itself.
 *
 * Run (a dev or preview server is already up):
 * `nub apps/docs/scripts/data-previews-probe.ts`
 * `--url <base>` (default `http://127.0.0.1:4175`), `--timeout <ms>`,
 * `--chrome <path>`.
 */

import { findChrome, openChrome, type ChromePage } from "./chrome-session.ts";

/** The pages this probe visits, and the drawing each one carries. */
export const previewPages = {
  expandable: "/docs/data-display/expandable-rows",
  toolbar: "/docs/data-display/data-toolbar",
  frozen: "/docs/data-display/frozen-columns",
  keyValue: "/docs/data-display/key-value",
} as const;

/**
 * The numbers the drawings must report.
 *
 * `data-previews.test.ts` derives each one from the demo module that paints it,
 * so a record added to a drawing asks this probe to expect the new count rather
 * than printing a stale one.
 */
export const expected = {
  /** `LISTED_FILES` and the one panel the expandable page opens on. */
  expandableRows: 4,
  openOnMount: 1,
  openAfterPress: 2,
  /** `QUEUE_ROWS`, and the records a "staging" query keeps. */
  toolbarRows: 6,
  toolbarMatches: 3,
  /** `FROZEN_RECORDS`, and the offset the probe scrolls one pane by. */
  frozenRows: 10,
  frozenOffset: 72,
  frozenPan: 40,
  /** `LABEL_WIDTHS`: the default track, and the wide one. */
  labelWidth: 120,
  wideLabelWidth: 168,
} as const;

/** True when a node carries React's props — i.e. its handlers are attached. */
const hydrated = (selector: string): string => `(() => {
  const node = document.querySelector(${JSON.stringify(selector)});
  return node !== null && Object.keys(node).some((key) => key.startsWith("__reactProps")) ? "yes" : "no";
})()`;

/** The React prop key a node carries, so a press is not a no-op on markup. */
export const hydrateScript = (selector: string): string => hydrated(selector);

/** The expandable-rows state: how many rows, which are open, and the readout. */
export const expandableState = (): string => `(() => {
  const rows = [...document.querySelectorAll(".gx-er-row")];
  return [
    rows.length,
    rows.filter((row) => row.getAttribute("aria-expanded") === "true").length,
    document.querySelector(".gx-demo-readout")?.textContent?.trim() ?? "no-readout",
  ].join("|");
})()`;

/** Press the row whose name is `name`, the way a reader does. */
export const pressRow = (name: string): string => `(() => {
  const row = [...document.querySelectorAll(".gx-er-row")]
    .find((candidate) => (candidate.textContent ?? "").includes(${JSON.stringify(name)}));
  if (row === undefined) return "no-row";
  row.click();
  return "pressed";
})()`;

/** Type `query` into the toolbar's field through the native value setter. */
export const typeQuery = (query: string): string => `(() => {
  const input = document.querySelector(".gx-toolbar input[type=search]");
  if (input === null) return "no-field";
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, ${JSON.stringify(query)});
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return "typed";
})()`;

/** What the toolbar reports: the readout's text and the rows it kept. */
export const toolbarState = (): string => `(() => [
  document.querySelector(".gx-demo-readout")?.textContent?.trim() ?? "no-readout",
  [...document.querySelectorAll(".gx-toolbar-row")].length,
].join("|"))()`;

/** Scroll one frozen pane, then report both panes' offsets. */
export const scrollPane = (
  pane: "frozen" | "data",
  top: number,
  left: number,
): string => `(() => {
  const body = document.querySelector('[data-pane="${pane}"] .gx-fc-body');
  if (body === null) return "no-pane";
  body.scrollTop = ${top};
  body.scrollLeft = ${left};
  body.dispatchEvent(new Event("scroll"));
  return "scrolled";
})()`;

/** Both panes' offsets, as `frozen:top,left|data:top,left`. */
export const frozenState = (): string => `(() => {
  const read = (pane) => {
    const body = document.querySelector('[data-pane="' + pane + '"] .gx-fc-body');
    return body === null ? "none" : Math.round(body.scrollTop) + "," + Math.round(body.scrollLeft);
  };
  return ["frozen:" + read("frozen"), "data:" + read("data")].join("|");
})()`;

/** Press the key-value column's choice with `label`. */
export const pressChoice = (label: string): string => `(() => {
  const button = [...document.querySelectorAll(".gx-demo-choice")]
    .find((candidate) => (candidate.textContent ?? "").trim() === ${JSON.stringify(label)});
  if (button === undefined) return "no-choice";
  button.click();
  return "pressed";
})()`;

/** The width every label cell paints, and the readout. */
export const keyValueState = (): string => `(() => {
  const ticks = [...document.querySelectorAll(".gx-kv-label")].map((cell) => Math.round(cell.getBoundingClientRect().width));
  return [
    [...new Set(ticks)].join(","),
    document.querySelector(".gx-demo-readout")?.textContent?.trim() ?? "no-readout",
  ].join("|");
})()`;

/** Poll an expression until it stops answering `waitingFor`. */
const until = async (
  read: () => Promise<string>,
  accept: (value: string) => boolean,
  timeout: number,
): Promise<string | undefined> => {
  const started = Date.now();
  let value = await read().catch(() => "");
  while (!accept(value) && Date.now() - started < timeout) {
    await new Promise((wait) => setTimeout(wait, 50));
    value = await read().catch(() => "");
  }
  return accept(value) ? value : undefined;
};

/** Navigate the open page and wait for its drawing to hydrate. */
const visit = async (
  page: ChromePage,
  url: string,
  selector: string,
  budget: number,
): Promise<boolean> => {
  await page.run(`location.href = ${JSON.stringify(url)}`);
  const ready =
    (await until(
      () => page.text(hydrated(selector)),
      (value) => value === "yes",
      budget,
    )) !== undefined;
  // React's props appear on the first hydrated node before the commit that
  // attaches the listeners: a press in that window is a no-op (measured — the
  // expandable row kept its panel and the toolbar reported nothing). One quiet
  // moment after `ready` is the page a reader presses.
  if (ready) await new Promise((wait) => setTimeout(wait, 300));
  return ready;
};

/** Run the probe. Returns the process exit code. */
export const main = async (argv: ReadonlyArray<string>): Promise<number> => {
  const argument = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index === -1 ? undefined : argv[index + 1];
  };
  const base = argument("--url") ?? "http://127.0.0.1:4175";
  const budget = Number(argument("--timeout") ?? "30000");
  const chrome = findChrome(argument("--chrome"), process.env);
  if (chrome === undefined) {
    console.error("no browser: pass --chrome <path> or set CHROME_PATH");
    return 2;
  }

  const session = await openChrome(chrome, `${base}/docs`, 1280, 900);
  const failures: Array<string> = [];
  const check = (name: string, actual: string, want: string): void => {
    if (actual === want) console.log(`PASS ${name}: ${actual}`);
    else failures.push(`${name}: expected ${want}, got ${actual}`);
  };

  try {
    const page = session.page;

    if (
      !(await visit(
        page,
        `${base}${previewPages.expandable}`,
        ".gx-er-row",
        budget,
      ))
    ) {
      console.error("FAIL the expandable-rows drawing never hydrated");
      return 1;
    }
    check(
      "expandable: the page opens one panel",
      await page.text(expandableState()),
      `${expected.expandableRows}|${expected.openOnMount}|1 of ${expected.expandableRows} panels open · the row is the toggle, Enter and Space included`,
    );
    await page.run(pressRow("notes.md"));
    check(
      "expandable: a second row opens and leaves the first open",
      await page.text(expandableState()),
      `${expected.expandableRows}|${expected.openAfterPress}|2 of ${expected.expandableRows} panels open · the row is the toggle, Enter and Space included`,
    );
    await page.run(pressRow("harbour-chart.png"));
    check(
      "expandable: a second press closes only its own row",
      await page.text(expandableState()),
      `${expected.expandableRows}|${expected.openOnMount}|1 of ${expected.expandableRows} panels open · the row is the toggle, Enter and Space included`,
    );

    if (
      !(await visit(
        page,
        `${base}${previewPages.toolbar}`,
        ".gx-toolbar input",
        budget,
      ))
    ) {
      console.error("FAIL the data-toolbar drawing never hydrated");
      return 1;
    }
    check(
      "toolbar: every record paints before a query",
      await page.text(toolbarState()),
      `typed “” · reported “” · ${expected.toolbarRows} of ${expected.toolbarRows} rows · wait 150 ms|${expected.toolbarRows}`,
    );
    await page.run(typeQuery("staging"));
    const reported = await until(
      () => page.text(toolbarState()),
      (value) => value.includes("reported “staging”"),
      2000,
    );
    check(
      "toolbar: the pause reports the query, and the rows narrow",
      reported ?? "never reported",
      `typed “staging” · reported “staging” · ${expected.toolbarMatches} of ${expected.toolbarRows} rows · wait 150 ms|${expected.toolbarMatches}`,
    );

    if (
      !(await visit(
        page,
        `${base}${previewPages.frozen}`,
        '[data-pane="data"] .gx-fc-body',
        budget,
      ))
    ) {
      console.error("FAIL the frozen-columns drawing never hydrated");
      return 1;
    }
    await page.run(scrollPane("data", expected.frozenOffset, 0));
    check(
      "frozen: a wheel over the data pane moves the frozen column with it",
      await page.text(frozenState()),
      `frozen:${expected.frozenOffset},0|data:${expected.frozenOffset},0`,
    );
    await page.run(
      scrollPane("data", expected.frozenOffset, expected.frozenPan),
    );
    await page.run(scrollPane("frozen", 0, 0));
    check(
      "frozen: a vertical mirror carries the data pane's x",
      await page.text(frozenState()),
      `frozen:0,0|data:0,${expected.frozenPan}`,
    );

    if (
      !(await visit(
        page,
        `${base}${previewPages.keyValue}`,
        ".gx-kv-label",
        budget,
      ))
    ) {
      console.error("FAIL the key-value drawing never hydrated");
      return 1;
    }
    check(
      "key-value: the column is the default track",
      await page.text(keyValueState()),
      `${expected.labelWidth}|label column ${expected.labelWidth}px · every value begins at the track's edge`,
    );
    await page.run(pressChoice("NaN"));
    check(
      "key-value: a width the layout cannot paint reads as the default",
      await page.text(keyValueState()),
      `${expected.labelWidth}|label column ${expected.labelWidth}px · NaN reads as the ${expected.labelWidth}px default`,
    );
    await page.run(pressChoice(`${expected.wideLabelWidth}`));
    check(
      "key-value: a readable width is painted as the caller wrote it",
      await page.text(keyValueState()),
      `${expected.wideLabelWidth}|label column ${expected.wideLabelWidth}px · every value begins at the track's edge`,
    );
  } finally {
    await session.close();
  }

  if (failures.length === 0) {
    console.log(
      `PASS the four data-lane drawings answer a reader's press (${expected.expandableRows}+${expected.toolbarRows}+${expected.frozenRows} records, ${expected.toolbarMatches} kept)`,
    );
    return 0;
  }
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  return 1;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main(process.argv.slice(2));
}
