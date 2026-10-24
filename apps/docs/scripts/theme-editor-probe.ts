/**
 * Prove the theme editor edits, audits and resets a theme in a browser that
 * refuses site data.
 *
 * `/docs/themes` is the page a consumer opens to take one of the library's
 * styles, change it and copy the result. Three properties had no browser
 * measurement: that a hydrated colour field reaches the preview and the audit,
 * that **Reset** returns the page to the base it opened on, and that the editor
 * survives a browser whose `localStorage` throws — the platform switch already
 * answers that refusal as absence, while the editor read the store directly
 * from its mount effect and lost the page to `Something went wrong`.
 *
 * The failing edit is not a chosen hex: the probe reads the page's own
 * `background` value and writes it into `primary`, so the pair the audit flags
 * is the one the gate measures — `src/lib/theme-editor-probe.test.ts` holds
 * that expectation to `themeFindings`.
 *
 * Run (a dev or preview server is already up):
 * `nub apps/docs/scripts/theme-editor-probe.ts`
 * `--url <url>`, `--timeout <ms>` (hydration budget), `--chrome <path>`.
 */

import * as Schema from "effect/Schema";
import * as Option from "effect/Option";
import { findChrome, openChrome } from "./chrome-session.ts";
import { hasHandler } from "./react-ready.ts";

/** The page a preview server serves. */
export const defaultUrl = "http://localhost:4175/docs/themes";

/** The editor's root. */
export const editorSelector = ".gx-theme-editor";

/** The control **Reset** presses. */
export const resetSelector = ".gx-te-reset";

/** The live audit readout under the preview. */
export const auditSelector = ".gx-te-audit";

/** A colour field's label, as the editor names it. */
export const colourField = (role: string): string =>
  `input[aria-label="${role} value"]`;

/**
 * The script installed before the page's own scripts, so every storage call a
 * reader's browser would refuse is refused here — and counted, so a probe that
 * never reached the store cannot pass as one that survived it.
 */
export const storageRefusal = `(() => {
  let attempts = 0;
  const refuse = () => function () {
    attempts += 1;
    throw new Error("SecurityError: site data is blocked");
  };
  Storage.prototype.getItem = refuse();
  Storage.prototype.setItem = refuse();
  Storage.prototype.removeItem = refuse();
  Object.defineProperty(window, "__storeAttempts", {
    get: () => attempts,
  });
})()`;

/** The state the probe reads at one instant. */
export class EditorReadout extends Schema.Class<EditorReadout>("EditorReadout")(
  {
    mounted: Schema.Boolean,
    background: Schema.String,
    primary: Schema.String,
    audit: Schema.String,
    findings: Schema.Int,
    shared: Schema.Boolean,
    attempts: Schema.Int,
  },
) {}

const ReadoutBody = Schema.fromJsonString(EditorReadout);

/** Read the page's readout; `None` when it is not the shape the probe wrote. */
export const parseReadout = Schema.decodeUnknownOption(ReadoutBody);

/** The readout as one JSON line the probe parses back. */
const readEditor = `(() => {
  const value = (role) =>
    document.querySelector('input[aria-label="' + role + ' value"]')?.value ??
    "";
  const audit = document.querySelector('${auditSelector}');
  return JSON.stringify({
    mounted: document.querySelector('${editorSelector}') !== null,
    background: value("background"),
    primary: value("primary"),
    audit: audit?.innerText ?? "",
    findings: audit === null ? -1 : audit.querySelectorAll("[data-kind]").length,
    shared: new URLSearchParams(location.search).get("theme") !== null,
    attempts: Number(window.__storeAttempts ?? -1),
  });
})()`;

/** Whether the editor's Reset button carries React's own handler. */
export const hydrated = `(() => {
  const reset = document.querySelector('${resetSelector}');
  if (reset === null) return "missing";
  return ${hasHandler("reset")} ? "ready" : "cold";
})()`;

/**
 * Write a value into a controlled colour field.
 *
 * React keeps its own value tracker, so assigning `input.value` directly never
 * reaches its change handler — the same rule the search probe measured. The
 * prototype's setter is what makes the `input` event carry a value React reads.
 */
export const typeValue = (role: string, value: string): string => `(() => {
  const input = document.querySelector('${colourField(role)}');
  if (input === null) return "no-input";
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  if (setter === undefined) return "no-setter";
  setter.call(input, ${JSON.stringify(value)});
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  return "typed";
})()`;

/** Poll `read` until `accept` holds, or the budget runs out. */
const until = async (
  read: () => Promise<string>,
  accept: (value: string) => boolean,
  timeout: number,
): Promise<string | undefined> => {
  const started = Date.now();
  let value = await read();
  while (!accept(value) && Date.now() - started < timeout) {
    await new Promise((wait) => setTimeout(wait, 250));
    value = await read();
  }
  return accept(value) ? value : undefined;
};

/** Run the project. Returns the process exit code. */
export const main = async (argv: ReadonlyArray<string>): Promise<number> => {
  const argument = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index === -1 ? undefined : argv[index + 1];
  };
  const url = argument("--url") ?? defaultUrl;
  const budget = Number(argument("--timeout") ?? "90000");
  if (!Number.isFinite(budget) || budget <= 0) {
    console.error("FAIL --timeout must be a positive number of milliseconds");
    return 2;
  }
  const chrome = findChrome(argument("--chrome"), process.env);
  if (chrome === undefined) {
    console.error("no browser: pass --chrome <path> or set CHROME_PATH");
    return 2;
  }

  const session = await openChrome(chrome, url, 1280, 900, {
    preload: storageRefusal,
  });
  const failures: Array<string> = [];

  const read = async (): Promise<EditorReadout | undefined> =>
    Option.getOrUndefined(parseReadout(await session.page.text(readEditor)));

  try {
    const ready = await until(
      () => session.page.text(hydrated),
      (state) => state === "ready",
      budget,
    );
    if (ready === undefined) {
      console.error(
        `FAIL the editor never hydrated within ${budget} ms (it carries no React onClick)`,
      );
      return 1;
    }

    const opening = await read();
    if (opening === undefined) {
      console.error("FAIL the editor reported no state the probe could read");
      return 1;
    }

    if (!opening.mounted) {
      failures.push("the editor is not on the page");
    }
    if (opening.findings !== 0) {
      failures.push(
        `the base style opened with ${opening.findings} audit findings`,
      );
    }
    if (!opening.audit.includes("Passes the library audit")) {
      failures.push("the opening audit did not report a pass");
    }
    if (opening.shared) {
      failures.push("the page opened with a `?theme=` the reader never set");
    }
    if (opening.attempts < 1) {
      failures.push(
        "the store was never read, so a refusal was not measured (the editor skipped its remembered state)",
      );
    }

    // The browser refused every call above and the editor drew anyway — the
    // failure this probe exists for is the page that never reaches this line.
    if (failures.length === 0) {
      console.log(
        `base: primary ${opening.primary}, ${opening.attempts} refused storage calls, audit passes`,
      );
    }

    const typed = await session.page.text(
      typeValue("primary", opening.background),
    );
    if (typed !== "typed") {
      failures.push(`the primary field could not be typed into (${typed})`);
    }

    const edited = await until(
      () => session.page.text(readEditor),
      (text) => {
        const state = Option.getOrUndefined(parseReadout(text));
        return state !== undefined && state.findings > 0;
      },
      15000,
    );
    const after =
      edited === undefined
        ? undefined
        : Option.getOrUndefined(parseReadout(edited));
    if (after === undefined) {
      failures.push(
        "an edit that should fail the audit reported no finding (the field did not reach the gate)",
      );
    } else {
      if (after.primary !== after.background) {
        failures.push(
          `the preview kept ${after.primary} while the field said ${after.background}`,
        );
      }
      if (!after.audit.toLowerCase().includes("primary")) {
        failures.push("the audit named no `primary` finding");
      }
      if (!after.shared) {
        failures.push("the edit was not written to `?theme=`");
      }
      if (!after.mounted) {
        failures.push("the editor left the page after an edit");
      }
      console.log(
        `edit: ${after.findings} findings, ${after.shared ? "?theme= written" : "no URL"}`,
      );
    }

    await session.page.run(
      `document.querySelector('${resetSelector}').click()`,
    );
    const back = await until(
      () => session.page.text(readEditor),
      (text) => {
        const state = Option.getOrUndefined(parseReadout(text));
        return (
          state !== undefined &&
          state.findings === 0 &&
          state.primary === opening.primary
        );
      },
      15000,
    );
    if (back === undefined) {
      const now = await read();
      failures.push(
        `Reset did not return the page to ${opening.primary} (${now?.primary ?? "unreadable"})`,
      );
    } else if (Option.getOrUndefined(parseReadout(back))?.shared === true) {
      failures.push("Reset left `?theme=` in the URL");
    } else {
      console.log("reset: the base style and the passing audit are back");
    }
  } finally {
    await session.close();
  }

  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    return 1;
  }
  console.log(
    "PASS the theme editor edits, audits and resets a theme in a browser that refuses site data",
  );
  return 0;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main(process.argv.slice(2));
}
