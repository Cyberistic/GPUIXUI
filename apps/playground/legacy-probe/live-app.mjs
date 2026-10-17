/**
 * Live GPUix 0.5.1 window probe (darwin-x64).
 *
 * Answers the question the offscreen renderer could not: in a real GPUI window,
 * do focus events fire, does the wheel scroll, and does native input work?
 * The automation driver connects over stdin because stdin is a pipe here.
 */
import { createElement as h, useRef, useState } from "react";
import { render } from "@gpuix/react";

function Probe() {
  const [focused, setFocused] = useState("none");
  const [value, setValue] = useState("");
  const [split, setSplit] = useState(320);
  const [scrollDelta, setScrollDelta] = useState(0);
  const gesture = useRef(null);

  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        padding: 16,
        gap: 8,
        backgroundColor: "#101010",
        height: "100%",
      },
    },
    h(
      "text",
      { testId: "focus-readout", style: { color: "#ffffff" } },
      `focus=${focused}`,
    ),
    h(
      "text",
      { testId: "value-readout", style: { color: "#ffffff" } },
      `value=${value}`,
    ),
    h(
      "text",
      { testId: "split-readout", style: { color: "#ffffff" } },
      `split=${split}`,
    ),
    h(
      "text",
      { testId: "scroll-readout", style: { color: "#ffffff" } },
      `scrollDelta=${scrollDelta}`,
    ),
    h(
      "div",
      {
        testId: "focus-a",
        tabIndex: 0,
        style: {
          width: 200,
          height: 28,
          backgroundColor: "#2b3a55",
          borderRadius: 4,
        },
        onFocus: () => setFocused("a"),
        onBlur: () => setFocused("blur"),
      },
      h("text", { style: { color: "#ffffff" } }, "focus a"),
    ),
    h("input", {
      testId: "field",
      value,
      onChange: (event) => setValue(event.value ?? ""),
      onFocus: () => setFocused("field"),
      style: {
        width: 240,
        height: 30,
        padding: 6,
        backgroundColor: "#1d1d1d",
        color: "#ffffff",
        borderRadius: 4,
      },
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
          style: { width: split, backgroundColor: "#243", flexShrink: 0 },
        },
        h("text", { style: { color: "#ffffff" } }, "A"),
      ),
      h("div", {
        testId: "divider",
        style: { width: 8, backgroundColor: "#777", cursor: "col-resize" },
        onMouseDown: (event) => {
          gesture.current = { x: event.x ?? 0, start: split };
        },
        onMouseMove: (event) => {
          const g = gesture.current;
          if (!g) return;
          setSplit(
            Math.max(80, Math.min(480, g.start + ((event.x ?? 0) - g.x))),
          );
        },
        onMouseUp: () => {
          gesture.current = null;
        },
      }),
      h(
        "div",
        { style: { flexGrow: 1, backgroundColor: "#222" } },
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
        onScroll: (e) => setScrollDelta(Math.round(e.deltaY ?? 0)),
      },
      ...Array.from({ length: 40 }, (_, i) =>
        h(
          "div",
          { key: i, testId: `srow-${i}`, style: { height: 24 } },
          h("text", { style: { color: "#cccccc" } }, `srow-${i}`),
        ),
      ),
    ),
  );
}

render(h(Probe), { title: "gpuix-live-probe", width: 700, height: 520 });
