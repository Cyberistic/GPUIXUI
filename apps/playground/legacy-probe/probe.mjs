/**
 * GPUix 0.5.1 capability probe (the last release with a darwin-x64 binding).
 *
 * Why this exists: the library targets 0.10.0, and this Intel Mac has no
 * binding for it (ADR 0001). 0.5.1 *does* run here, so this probe answers the
 * mission's underlying feasibility question — does GPUI on this hardware do
 * layout, text, input, overlay anchoring, pointer-capture resizing, virtual
 * lists and scrolling? — with real GPU output instead of prose.
 *
 * Every step is isolated, so one absent API does not hide the rest. Run it with
 * `nub install && nub run probe` in this directory. `REPORT.md` records what it
 * measured. It never sets a component status: its verdicts are evidence about
 * the hardware and runtime, not verification of a 0.10 component.
 */
import { createElement as h, useRef, useState } from "react";
import * as testing from "@gpuix/react/testing";
import * as automation from "@gpuix/react/automation";

const report = { steps: [], errors: [] };
const step = async (name, value) => {
  try {
    report.steps.push({
      name,
      value: typeof value === "function" ? await value() : value,
    });
  } catch (error) {
    report.steps.push({ name, value: `THREW: ${error}` });
  }
};
const attempt = async (name, fn) => {
  try {
    await fn();
  } catch (error) {
    report.errors.push({ name, error: String(error) });
  }
};

function Probe() {
  const [clicks, setClicks] = useState(0);
  const [value, setValue] = useState("");
  const [submits, setSubmits] = useState(0);
  const [focus, setFocus] = useState("none");
  const [open, setOpen] = useState(false);
  const [outside, setOutside] = useState("no");
  const [escape, setEscape] = useState("no");
  const [scrollDelta, setScrollDelta] = useState(0);
  const [split, setSplit] = useState(320);
  const gesture = useRef(null);

  return h(
    "div",
    {
      style: { display: "flex", flexDirection: "column", padding: 16, gap: 8 },
    },
    h(
      "text",
      { testId: "clicks-readout", style: { color: "#ffffff" } },
      `clicks=${clicks}`,
    ),
    h(
      "text",
      { testId: "input-readout", style: { color: "#ffffff" } },
      `value=${value} submits=${submits}`,
    ),
    h(
      "text",
      { testId: "focus-readout", style: { color: "#ffffff" } },
      `focus=${focus}`,
    ),
    h(
      "text",
      { testId: "outside-readout", style: { color: "#ffffff" } },
      `outside=${outside}`,
    ),
    h(
      "text",
      { testId: "escape-readout", style: { color: "#ffffff" } },
      `escape=${escape}`,
    ),
    h(
      "text",
      { testId: "scroll-readout", style: { color: "#ffffff" } },
      `delta=${scrollDelta}`,
    ),
    h(
      "text",
      { testId: "split-readout", style: { color: "#ffffff" } },
      `split=${split}`,
    ),

    h(
      "div",
      {
        testId: "bump",
        tabIndex: 0,
        style: { width: 120, height: 32, backgroundColor: "#333333" },
        onClick: () => setClicks((c) => c + 1),
        onFocus: () => setFocus("bump"),
        onBlur: () => setFocus("blur"),
      },
      h("text", { style: { color: "#ffffff" } }, "bump"),
    ),
    h("input", {
      testId: "field",
      value,
      onChange: (event) => setValue(event.value ?? ""),
      onSubmit: () => setSubmits((s) => s + 1),
      onFocus: () => setFocus("field"),
      style: {
        width: 240,
        height: 30,
        padding: 6,
        backgroundColor: "#1d1d1d",
        color: "#ffffff",
      },
    }),
    h("textarea", {
      testId: "area",
      value,
      onChange: (event) => setValue(event.value ?? ""),
      style: {
        width: 240,
        height: 56,
        padding: 6,
        backgroundColor: "#1d1d1d",
        color: "#ffffff",
      },
    }),

    h(
      "div",
      {
        testId: "outside-target",
        style: { width: 200, height: 28, backgroundColor: "#445566" },
        onMouseDownOutside: () => setOutside("yes"),
      },
      h("text", { style: { color: "#ffffff" } }, "outside target"),
    ),
    h(
      "div",
      {
        testId: "escape-target",
        tabIndex: 0,
        style: { width: 200, height: 28, backgroundColor: "#556644" },
        onKeyDown: (event) => {
          if (event.key === "escape") setEscape("yes");
        },
      },
      h("text", { style: { color: "#ffffff" } }, "escape target"),
    ),
    h("div", {
      testId: "empty-space",
      style: { width: 200, height: 24, backgroundColor: "#111111" },
    }),

    h(
      "div",
      {
        style: {
          display: "flex",
          width: 600,
          height: 36,
          backgroundColor: "#181818",
        },
      },
      h(
        "div",
        {
          testId: "pane-a",
          style: { width: split, backgroundColor: "#223344", flexShrink: 0 },
        },
        h("text", { style: { color: "#ffffff" } }, "A"),
      ),
      h("div", {
        testId: "divider",
        style: { width: 8, backgroundColor: "#777777", cursor: "col-resize" },
        onMouseDown: (event) => {
          gesture.current = { x: event.x ?? 0, start: split };
        },
        onMouseMove: (event) => {
          const active = gesture.current;
          if (!active) return;
          setSplit(
            Math.max(
              80,
              Math.min(480, active.start + ((event.x ?? 0) - active.x)),
            ),
          );
        },
        onMouseUp: () => {
          gesture.current = null;
        },
      }),
      h(
        "div",
        { style: { flexGrow: 1, backgroundColor: "#222222" } },
        h("text", { style: { color: "#ffffff" } }, "B"),
      ),
    ),

    h(
      "div",
      {
        testId: "scroller",
        style: {
          width: 260,
          height: 120,
          overflow: "scroll",
          backgroundColor: "#141414",
        },
        onScroll: (event) => setScrollDelta(Math.round(event.deltaY ?? 0)),
      },
      ...Array.from({ length: 40 }, (_, i) =>
        h(
          "div",
          { key: i, testId: `srow-${i}`, style: { height: 24 } },
          h("text", { style: { color: "#cccccc" } }, `srow-${i}`),
        ),
      ),
    ),

    h(
      "div",
      { testId: "code-host", style: { width: 300, height: 60 } },
      h("code", { code: "const a = 1\nconst b = 2", language: "ts" }),
      h("markdown", { children: "# Title\n\nbody" }),
    ),

    h("canvas", {
      testId: "canvas-element",
      style: { width: 100, height: 40, backgroundColor: "#550055" },
    }),

    h(
      "virtual-list",
      { testId: "vlist", style: { width: 260, height: 120 } },
      ...Array.from({ length: 500 }, (_, i) =>
        h(
          "div",
          { key: i, style: { height: 24 } },
          h("text", { style: { color: "#cccccc" } }, `v-${i}`),
        ),
      ),
    ),

    h(
      "div",
      {
        testId: "toggle",
        style: { width: 120, height: 24, backgroundColor: "#444444" },
        onClick: () => setOpen((o) => !o),
      },
      h("text", { style: { color: "#ffffff" } }, "toggle"),
    ),
    open
      ? h(
          "anchored",
          {
            testId: "overlay",
            style: { width: 160, height: 60, backgroundColor: "#232323" },
          },
          h("text", { style: { color: "#ffffff" } }, "overlay-open"),
        )
      : null,
  );
}

const { render, renderer } = testing.createTestRoot({
  width: 1000,
  height: 900,
});
await step("platform", `${process.platform}-${process.arch}`);
await step("node", process.version);
await step("hasNativeTestRenderer", testing.hasNativeTestRenderer);
render(h(Probe));
renderer.flush();

const app = await automation.connectTest(renderer);
const content = (testId) => app.getByTestId(testId).textContent();
const idOf = (testId) => {
  const element = renderer.findByTestId(testId);
  return element ? element.id : null;
};
const yOf = (testId) => {
  const element = renderer.findByTestId(testId);
  const bounds = element ? renderer.getElementBounds(element.id) : null;
  return bounds ? (Array.isArray(bounds) ? bounds[1] : bounds.y) : null;
};
const xOf = (testId) => {
  const element = renderer.findByTestId(testId);
  const bounds = element ? renderer.getElementBounds(element.id) : null;
  return bounds ? (Array.isArray(bounds) ? bounds[0] : bounds.x) : null;
};

await step("layout.dividerBounds", () =>
  renderer.getElementBounds(idOf("divider")),
);
await step("layout.paneABounds", () =>
  renderer.getElementBounds(idOf("pane-a")),
);
await step("text.allText", () => renderer.getAllText());
await step("text.paintedCodeAndMarkdown", () =>
  renderer
    .getPaintedText()
    .filter(
      (line) => line.startsWith("const") || line === "Title" || line === "body",
    ),
);

await attempt("overlay", async () => {
  await app.getByTestId("toggle").click();
  renderer.flush();
  await step("overlay.painted", () =>
    renderer.getPaintedText().includes("overlay-open"),
  );
});

await attempt("click", async () => {
  await app.getByTestId("bump").click();
  renderer.flush();
  await step("click.readout", () => content("clicks-readout"));
});

await attempt("input", async () => {
  await app.getByTestId("field").fill("hello gpuix");
  renderer.flush();
  await step("input.afterFill", () => content("input-readout"));
  await app.getByTestId("field").press("enter");
  renderer.flush();
  await step("input.afterEnter", () => content("input-readout"));
  await app.getByTestId("area").fill("line one");
  renderer.flush();
  await step("input.textarea", () => content("input-readout"));
});

await attempt("focus", async () => {
  await app.getByTestId("bump").click();
  renderer.flush();
  await step("focus.afterClick", () => content("focus-readout"));
  await app.getByTestId("bump").press("tab");
  renderer.flush();
  await step("focus.afterTab", () => content("focus-readout"));
});

await attempt("outside", async () => {
  await app.getByTestId("empty-space").click();
  renderer.flush();
  await step("outside.afterClick", () => content("outside-readout"));
});

await attempt("escape", async () => {
  await app.getByTestId("escape-target").click();
  renderer.flush();
  await app.getByTestId("escape-target").press("escape");
  renderer.flush();
  await step("escape.readout", () => content("escape-readout"));
});

await attempt("drag", async () => {
  await app.getByTestId("divider").dragBy(60, 0);
  renderer.flush();
  await step("drag.splitReadout", () => content("split-readout"));
  await step("drag.paneABounds", () =>
    renderer.getElementBounds(idOf("pane-a")),
  );
  await app.getByTestId("divider").dragBy(-400, 0);
  renderer.flush();
  await step("drag.clampedReadout", () => content("split-readout"));
});

await attempt("scroll", async () => {
  await step("scroll.row0Before", () => yOf("srow-0"));
  await app.getByTestId("scroller").wheel(0, 200);
  renderer.flush();
  await step("scroll.deltaReadout", () => content("scroll-readout"));
  await step("scroll.row0AfterWheel", () => yOf("srow-0"));
  await step("scroll.offsetAfterWheel", () =>
    renderer.getScrollOffset(idOf("scroller")),
  );
  renderer.scrollTo(idOf("scroller"), 0, -40);
  renderer.flush();
  await step("scroll.row0AfterScrollTo", () => yOf("srow-0"));
  await step("scroll.offsetAfterScrollTo", () =>
    renderer.getScrollOffset(idOf("scroller")),
  );
});

await attempt("native-elements", async () => {
  await step(
    "canvas.elementType",
    () => renderer.findByTestId("canvas-element")?.type ?? "not-found",
  );
  await step("canvas.paintedBounds", () =>
    renderer.getElementBounds(idOf("canvas-element")),
  );
  await step("canvas.xOf", () => xOf("canvas-element"));
});

await attempt("virtual-list", async () => {
  const built = renderer
    .getPaintedText()
    .filter((line) => /^v-\d+$/.test(line));
  await step("vlist.declaredRows", () => 500);
  await step("vlist.builtRows", () => built.length);
  await step("vlist.firstRows", () => built.slice(0, 5));
});

await attempt("clock", async () => {
  await step("clock.pause", () => renderer.clockPause());
  await step("clock.fastForward", () => renderer.clockFastForward(200));
  await step("clock.resume", () => renderer.clockResume());
});

await attempt("screenshot", async () => {
  const directory = `${process.env.LEGACY_PROBE_ARTIFACTS ?? new URL("./.artifacts", import.meta.url).pathname}/`;
  await import("node:fs").then((fs) =>
    fs.mkdirSync(directory, { recursive: true }),
  );
  renderer.captureScreenshot(`${directory}offscreen.png`);
  return "written";
});

process.stdout.write(`LEGACY_PROBE ${JSON.stringify(report, null, 2)}\n`);
process.exit(0);
