import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  INLINE_EDIT_CHECKS,
  INLINE_EDIT_IDS,
  INLINE_EDIT_PLACEHOLDER,
  INLINE_EDIT_VALUE,
  inlineEditReadout,
} from "./inline-edit.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./inline-edit-probe.tsx");
const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");
const component = read("../../../../packages/components/src/inline-edit.tsx");

const sectionOf = (): string => {
  const heading = "### `inline-edit-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n## ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

const closed = {
  value: "x",
  draft: "x",
  commits: 1,
  edits: 1,
  editing: false,
} as const;

describe("the readout", () => {
  it("prints the value, the counters, the draft and the edit state", () => {
    expect(inlineEditReadout(closed)).toBe(
      "value=x commits=1 edits=1 draft=x editing=false",
    );
  });

  it("keeps a draft that differs from the committed value visible", () => {
    const discarded = inlineEditReadout({ ...closed, draft: "y", edits: 3 });
    expect(discarded).toContain("draft=y");
    expect(discarded).toContain("value=x");
    expect(discarded).not.toBe(inlineEditReadout(closed));
  });

  it("starts a window's readout from the caller's own value", () => {
    expect(
      inlineEditReadout({
        value: INLINE_EDIT_VALUE,
        draft: INLINE_EDIT_VALUE,
        commits: 0,
        edits: 0,
        editing: false,
      }),
    ).toContain(`value=${INLINE_EDIT_VALUE}`);
    expect(INLINE_EDIT_PLACEHOLDER).not.toBe(INLINE_EDIT_VALUE);
  });
});

describe("the view", () => {
  it("mounts the shipped control three times: named, disabled and empty", () => {
    expect(probe).toContain('from "@gpuixui/components"');
    expect(probe.match(/<InlineEdit\b/g)?.length).toBe(3);
    expect(probe.match(/disabled\n/g)?.length).toBe(1);
    expect(probe).toContain("placeholder={INLINE_EDIT_PLACEHOLDER}");
  });

  it("reads the draft where a consumer reads it, not off the input", () => {
    expect(
      probe.match(
        /onChange=\{\(event\) => \w+\.change\(event\.value \?\? ""\)\}/g,
      )?.length,
    ).toBe(3);
    expect(probe).not.toContain(
      "ctx.host.text(INLINE_EDIT_IDS.field),\n      typed.draft",
    );
    expect(probe).toContain(
      '"an edit is a draft: the caller\'s value has not moved"',
    );
  });

  it("addresses every part with a distinct id, and uses all of them", () => {
    const ids = Object.values(INLINE_EDIT_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    const used = Arr.filter(
      Arr.fromIterable(Object.keys(INLINE_EDIT_IDS)),
      (key) => probe.includes(`INLINE_EDIT_IDS.${key}`),
    );
    expect(used).toHaveLength(ids.length);
  });
});

describe("the steps", () => {
  it("drives both doors into the editor and both doors out", () => {
    expect(probe).toContain("ctx.host.click(INLINE_EDIT_IDS.field)");
    expect(probe).toContain('ctx.host.key("enter")');
    expect(probe).toContain('ctx.host.key("escape")');
    expect(probe).toContain('ctx.host.key("cmd-a")');
    expect(probe).toContain('ctx.host.key("x")');
  });

  it("asserts the focus the swap and the commit leave behind", () => {
    expect(probe).toContain('"the window focuses the editor the swap mounted"');
    expect(probe).toContain('"the commit returns the focus to the display"');
    expect(probe).toContain('"a cancelled edit returns the focus too"');
    expect(probe).toContain("INLINE_EDIT_IDS.field,");
  });

  it("records the disabled rule the window measured", () => {
    expect(probe).toContain(
      '"a press on a disabled control still gives it the focus"',
    );
    expect(probe).toContain(
      '"a disabled control refuses the key that opens an editor"',
    );
  });

  it("declares the count the assertions actually record", () => {
    const sites = Arr.length(
      Arr.fromIterable(probe.matchAll(/ctx\.expect\w+\(/g)),
    );
    expect(sites).toBe(INLINE_EDIT_CHECKS);
    expect(INLINE_EDIT_CHECKS).toBe(22);
  });

  it("measures the focus the component moves with the renderer itself", () => {
    expect(component).toContain("renderer?.focusElement?.(inputId)");
    expect(component).toContain("renderer?.focusElement?.(instance.id)");
    expect(component).toContain("tabIndex={disabled ? -1 : 0}");
  });
});

describe("the registry and the README", () => {
  it("registers the probe once, in the input capability", () => {
    const declared = Arr.filter(
      liveRegistry,
      (entry) => entry.id === "inline-edit-lifecycle",
    );
    expect(declared).toHaveLength(1);
    expect(declared[0]?.capability).toBe("input");
    expect(declared[0]?.title).toContain("InlineEdit");
    expect(scenarios).toContain("InlineEditProbe");
    expect(scenarios).toContain("inlineEditSteps");
  });

  it("documents the measurement under the version it was made on", () => {
    const section = sectionOf();
    expect(section).not.toBe("");
    expect(section).toContain(`${INLINE_EDIT_CHECKS} checks`);
    expect(section).toContain("`--only inline-edit-lifecycle`");
    expect(section).toContain("`src/live/inline-edit.ts`");
    expect(section).toContain("inline-edit.test.ts");
    expect(
      Arr.every(
        [
          "inline-edit-rest",
          "inline-edit-editing",
          "inline-edit-committed",
          "inline-edit-empty-committed",
        ],
        (capture) => section.includes(capture),
      ),
    ).toBe(true);
  });

  it("separates the door a window cannot measure from the doors it measured", () => {
    const section = sectionOf();
    expect(section).toContain("blur-delivery-lifecycle");
    expect(section).toContain("no blur");
    expect(probe).not.toContain("blur");
  });
});
