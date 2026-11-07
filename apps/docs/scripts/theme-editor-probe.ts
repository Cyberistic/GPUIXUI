import * as Schema from "effect/Schema";
import * as Option from "effect/Option";
import { findChrome, openChrome } from "./chrome-session.ts";
import { hasHandler } from "./react-ready.ts";

export const defaultUrl = "http://localhost:4175/themes";

export const editorSelector = ".gx-theme-editor";

export const resetSelector = ".gx-te-reset";

export const auditSelector = ".gx-te-audit";

export const colourField = (role: string): string =>
  `input[aria-label="${role} value"]`;

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

export const parseReadout = Schema.decodeUnknownOption(ReadoutBody);

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

export const hydrated = `(() => {
  const reset = document.querySelector('${resetSelector}');
  if (reset === null) return "missing";
  return ${hasHandler("reset")} ? "ready" : "cold";
})()`;

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
