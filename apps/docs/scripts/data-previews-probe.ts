import { findChrome, openChrome, type ChromePage } from "./chrome-session.ts";
import { propsOfScript } from "./react-ready.ts";

export const previewPages = {
  expandable: "/data-display/expandable-rows",
  toolbar: "/data-display/data-toolbar",
  frozen: "/data-display/frozen-columns",
  keyValue: "/data-display/key-value",
} as const;

export const expected = {
  expandableRows: 4,
  openOnMount: 1,
  openAfterPress: 2,

  toolbarRows: 6,
  toolbarMatches: 3,

  frozenRows: 10,
  frozenOffset: 72,

  labelWidth: 120,
  wideLabelWidth: 168,
} as const;

const hydrated = (selector: string): string => `(() => {
  const node = document.querySelector(${JSON.stringify(selector)});
  return node !== null && ${propsOfScript}(node) !== undefined ? "yes" : "no";
})()`;

export const hydrateScript = (selector: string): string => hydrated(selector);

export const expandableState = (): string => `(() => {
  const rows = [...document.querySelectorAll(".gx-dt-row[data-file]")];
  return [
    rows.length,
    rows.filter((row) => row.getAttribute("aria-expanded") === "true").length,
    document.querySelector(".gx-dt-caption")?.textContent?.trim() ?? "no-readout",
  ].join("|");
})()`;

export const pressRow = (name: string): string => `(() => {
  const row = [...document.querySelectorAll(".gx-dt-row[data-file]")]
    .find((candidate) => (candidate.textContent ?? "").includes(${JSON.stringify(name)}));
  if (row === undefined) return "no-row";
  row.click();
  return "pressed";
})()`;

export const typeQuery = (query: string): string => `(() => {
  const input = document.querySelector(".gx-dtoolbar input[type=search]");
  if (input === null) return "no-field";
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, ${JSON.stringify(query)});
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return "typed";
})()`;

export const toolbarState = (): string => `(() => [
  document.querySelector(".gx-data-readout")?.textContent?.trim() ?? "no-readout",
  [...document.querySelectorAll('.gx-dt[role=table] [data-row]')].length,
].join("|"))()`;

export const scrollPane = (
  pane: "frozen" | "data",
  top: number,
  left: number,
): string => `(() => {
  const body = document.querySelector('[data-pane="${pane}"] .gx-dt-frozen-body');
  if (body === null) return "no-pane";
  body.scrollTop = ${top};
  body.scrollLeft = ${left};
  body.dispatchEvent(new Event("scroll"));
  return "scrolled";
})()`;

export const frozenState = (): string => `(() => {
  const read = (pane) => {
    const body = document.querySelector('[data-pane="' + pane + '"] .gx-dt-frozen-body');
    return body === null ? "none" : Math.round(body.scrollTop) + "," + Math.round(body.scrollLeft);
  };
  return ["frozen:" + read("frozen"), "data:" + read("data")].join("|");
})()`;

export const pressChoice = (label: string): string => `(() => {
  const button = [...document.querySelectorAll(".gx-toggle")]
    .find((candidate) => (candidate.textContent ?? "").trim() === ${JSON.stringify(label)});
  if (button === undefined) return "no-choice";
  button.click();
  return "pressed";
})()`;

export const keyValueState = (): string => `(() => {
  const ticks = [...document.querySelectorAll(".gx-dkv-label")].map((cell) => Math.round(cell.getBoundingClientRect().width));
  return [
    [...new Set(ticks)].join(","),
    document.querySelector(".gx-data-readout")?.textContent?.trim() ?? "no-readout",
  ].join("|");
})()`;

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

  if (ready) await new Promise((wait) => setTimeout(wait, 300));
  return ready;
};

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

  const session = await openChrome(chrome, `${base}/`, 1280, 900);
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
        ".gx-dt-row[data-file]",
        budget,
      ))
    ) {
      console.error("FAIL the expandable-rows drawing never hydrated");
      return 1;
    }
    check(
      "expandable: the page opens one panel",
      await page.text(expandableState()),
      `${expected.expandableRows}|${expected.openOnMount}|1 of ${expected.expandableRows} panels open`,
    );
    await page.run(pressRow("notes.md"));
    check(
      "expandable: a second row opens and leaves the first open",
      await page.text(expandableState()),
      `${expected.expandableRows}|${expected.openAfterPress}|2 of ${expected.expandableRows} panels open`,
    );
    await page.run(pressRow("harbour-chart.png"));
    check(
      "expandable: a second press closes only its own row",
      await page.text(expandableState()),
      `${expected.expandableRows}|${expected.openOnMount}|1 of ${expected.expandableRows} panels open`,
    );

    if (
      !(await visit(
        page,
        `${base}${previewPages.toolbar}`,
        ".gx-dtoolbar input",
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
        '[data-pane="data"] .gx-dt-frozen-body',
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

    await page.run(scrollPane("frozen", expected.frozenOffset, 40));
    check(
      "frozen: the frozen pane never pans sideways",
      await page.text(frozenState()),
      `frozen:${expected.frozenOffset},0|data:${expected.frozenOffset},0`,
    );

    if (
      !(await visit(
        page,
        `${base}${previewPages.keyValue}`,
        ".gx-dkv-label",
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
