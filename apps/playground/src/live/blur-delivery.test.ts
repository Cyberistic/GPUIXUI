import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  BLUR_CHECKS,
  BLUR_IDS,
  TRACE_EMPTY,
  TRACE_PREFIX,
  traceOf,
} from "./blur-delivery.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./blur-delivery-probe.tsx");
const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");
const host = read("./host.ts");

const sectionOf = (): string => {
  const heading = "### `blur-delivery-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n## ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

const MEASURED_TRACE = `${TRACE_PREFIX}target:press plain:press toggle:press unmount:c edit:change after:press`;

describe("the trace codec", () => {
  it("prints an empty trace as a value, not as a blank line", () => {
    expect(traceOf([])).toBe(`${TRACE_PREFIX}${TRACE_EMPTY}`);
    expect(traceOf([])).not.toBe("");
  });

  it("keeps the order the window delivered, and one space between events", () => {
    expect(traceOf(["a:focus", "a:blur"])).toBe("trace=a:focus a:blur");
    expect(traceOf(["a:blur", "a:focus"])).not.toBe(
      traceOf(["a:focus", "a:blur"]),
    );
  });

  it("prefixes the line, so an event name cannot read as a bare value", () => {
    expect(traceOf(["plain:press"]).startsWith(TRACE_PREFIX)).toBe(true);
    expect(TRACE_PREFIX.length).toBeGreaterThan(0);
  });
});

describe("the view", () => {
  it("mounts the shipped controls the README's table names", () => {
    expect(probe).toContain('from "@gpuixui/primitives"');
    expect(probe).toContain('from "@gpuixui/components"');
    expect(probe).toContain("<InlineEdit");
    expect(probe.match(/<TracedField/g)?.length).toBe(3);
    expect(probe).toContain("<PlainSurface");
  });

  it("records every focus route in the one trace, in order", () => {
    expect(probe).toContain("setTrace((entries) => [...entries, entry])");
    expect(probe).toContain("onFocus={() => note(`${name}:focus`)}");
    expect(probe).toContain("onBlur={() => note(`${name}:blur`)}");
    expect(probe).toContain('onFocus={() => note("target:focus")}');
    expect(probe).toContain('onBlur={() => note("target:blur")}');
    expect(probe).toContain('onClick={() => note("target:press")}');
    expect(probe).toContain('onClick={() => note("plain:press")}');
  });

  it("addresses every part with a distinct id, and uses all of them", () => {
    const ids = Object.values(BLUR_IDS);
    expect(new Set(ids).size).toBe(ids.length);

    const used = Arr.filter(Arr.fromIterable(Object.keys(BLUR_IDS)), (key) =>
      probe.includes(`BLUR_IDS.${key}`),
    );
    expect(used).toHaveLength(ids.length);
  });

  it("prints the committed draft beside the trace, so a lost commit is data", () => {
    expect(probe).toContain("onCommit={(next) => {");
    expect(probe).toContain("note(`commit:${next}`)");

    expect(probe).toContain('onChange={() => note("edit:change")}');
  });
});

describe("the steps", () => {
  it("drives every route the README's table prints", () => {
    expect(probe).toContain("ctx.host.activateWindow");
    expect(probe).toContain("ctx.host.click(BLUR_IDS.fieldA)");
    expect(probe).toContain("ctx.host.click(BLUR_IDS.fieldB)");
    expect(probe).toContain("ctx.host.focusNext()");
    expect(probe).toContain("ctx.host.click(BLUR_IDS.target)");
    expect(probe).toContain("ctx.host.click(BLUR_IDS.plain)");
    expect(probe).toContain("ctx.host.focusElement(BLUR_IDS.fieldA)");
    expect(probe).toContain("ctx.host.blur");
    expect(probe).toContain("ctx.host.focusElement(BLUR_IDS.fieldC)");
    expect(probe).toContain("ctx.host.click(BLUR_IDS.toggle)");
    expect(probe).toContain("ctx.host.click(BLUR_IDS.edit)");
    expect(probe).toContain('ctx.host.key("x")');
  });

  it("asserts the focus the window is left with on each route", () => {
    expect(probe).toContain("BLUR_IDS.fieldA,");
    expect(probe).toContain("BLUR_IDS.fieldB,");
    expect(probe).toContain("BLUR_IDS.target,");
    expect(probe).toContain("BLUR_IDS.after,");
    expect(probe).toContain("the renderer's blur leaves nothing focused");
    expect(probe).toContain('"none"');
    expect(probe).toContain("the traversal moves the focus to the next stop");
  });

  it("asserts the trace it measured, event for event", () => {
    expect(probe).toContain(
      "target:press plain:press toggle:press unmount:c edit:change after:press",
    );

    expect(probe).toContain('note("edit:change")');
    expect(MEASURED_TRACE).toContain("edit:change");
    expect(MEASURED_TRACE).not.toContain("commit:");
  });

  it("declares the count the assertions actually record", () => {
    const sites = Arr.length(
      Arr.fromIterable(probe.matchAll(/ctx\.expect\w+\(/g)),
    );
    expect(sites).toBe(BLUR_CHECKS);
  });
});

describe("the registry and the README", () => {
  it("registers the probe once, in the focus capability", () => {
    const declared = Arr.filter(
      liveRegistry,
      (entry) => entry.id === "blur-delivery-lifecycle",
    );
    expect(declared).toHaveLength(1);
    expect(declared[0]?.capability).toBe("focus");
    expect(declared[0]?.title).toContain("delivers no onFocus or onBlur");
    expect(scenarios).toContain("BlurDeliveryProbe");
    expect(scenarios).toContain("blurDeliverySteps");
  });

  it("documents the measurement under the version it was made on", () => {
    const section = sectionOf();
    expect(section).toContain(`${BLUR_CHECKS} checks`);
    expect(section).toContain("`src/live/blur-delivery.ts`");
    expect(section).toContain("blur-delivery.test.ts");

    expect(section.replace(/\s+/g, " ")).toContain(MEASURED_TRACE);
  });

  it("names the cause, and the independent sign the window is not active", () => {
    const flat = sectionOf().replace(/\s+/g, " ");
    expect(flat).toContain("rendered_frame.window_active");
    expect(flat).toContain("set_active_for_tests(true)");

    expect(flat).toContain("no caret");
    expect(flat).toContain("`editor-overlay`");

    expect(flat).toContain(
      "the window is not active, so *every* route reads 0",
    );
    expect(flat).not.toContain("the two hosts genuinely differ");
  });

  it("says a draft committed on blur is unverified here, not that it works", () => {
    const flat = sectionOf().replace(/\s+/g, " ");
    expect(flat).toContain("unverified in this window");
    expect(flat).toContain("neither Tab nor a press commits it");
    expect(flat).not.toContain("the draft commits on blur in a window");
  });

  it("implements both optional verbs the probe needs on the live host", () => {
    expect(host).toContain("blur: () =>");
    expect(host).toContain("activateWindow: () =>");
    expect(host).toContain('| "blur"');
    expect(host).toContain('| "activateWindow"');
  });
});
