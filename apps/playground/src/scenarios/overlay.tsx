/**
 * `overlay-dialog` — an `<anchored>` popup that closes on Escape and outside
 * click.
 *
 * GPUix has no `z-index`; a deferred `<anchored>` layer paints above the tree,
 * which is what makes an overlay possible at all. The scenario asserts the
 * popup's text is painted while open, that Escape closes it, and that a click
 * outside closes it — three separate mechanisms, so a popup that only looks
 * right but cannot be dismissed fails here.
 *
 * Limitation: GPUix 0.10.0 exposes no way for component code to move focus
 * programmatically (`PublicInstance` has no `focus()`), so "focus returns to
 * the trigger" cannot be implemented or checked from a component. It is
 * recorded in the app README, not faked here.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { theme } from "../theme.js";
import { Body, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

const OverlayProbe = () => {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState("none");
  const close = (reason: string) => {
    setOpen(false);
    setLast(reason);
  };

  return (
    <div style={{ width: 480, height: 320, backgroundColor: theme.surface }}>
      <div
        testId="overlay-trigger"
        tabIndex={0}
        role="button"
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "enter") setOpen(true);
        }}
        style={{
          padding: 8,
          width: 120,
          borderRadius: 6,
          cursor: "pointer",
          backgroundColor: theme.panelAlt,
          hover: { backgroundColor: theme.border },
        }}
      >
        <Body>open</Body>
      </div>
      <div style={{ marginTop: 8 }}>
        <Readout testId="overlay-readout">{`open=${open} last=${last}`}</Readout>
      </div>
      {open ? (
        <anchored
          deferred
          position={{ x: 60, y: 120 }}
          priority={1}
          onMouseDownOutside={() => close("outside")}
          onKeyDown={(event) => {
            if (event.key === "escape") close("escape");
          }}
        >
          <div
            style={{
              padding: 12,
              backgroundColor: theme.panel,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 6,
            }}
          >
            <text testId="overlay-popup" style={{ color: theme.text }}>
              popup open
            </text>
          </div>
        </anchored>
      ) : null}
    </div>
  );
};

export const overlayScenario: PlaygroundScenario = {
  id: "overlay-dialog",
  title: "Anchored overlay: open, Escape and outside click",
  capability: "overlay",
  view: () => <OverlayProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      ctx.host.click("overlay-trigger");
      const opened = yield* ctx.expectSome(
        "overlay readout present",
        Option.fromNullishOr(ctx.host.text("overlay-readout")),
      );
      yield* ctx.expectContains(
        "trigger opened the popup",
        opened,
        "open=true",
      );
      yield* ctx.expectContains(
        "popup painted",
        ctx.host.paintedText().join("\n"),
        "popup open",
      );

      ctx.host.key("escape");
      const closed = yield* ctx.expectSome(
        "overlay readout after escape",
        Option.fromNullishOr(ctx.host.text("overlay-readout")),
      );
      yield* ctx.expectContains(
        "Escape closed the popup",
        closed,
        "open=false last=escape",
      );

      ctx.host.click("overlay-trigger");
      ctx.host.clickWindow(460, 310);
      const dismissed = yield* ctx.expectSome(
        "overlay readout after outside click",
        Option.fromNullishOr(ctx.host.text("overlay-readout")),
      );
      yield* ctx.expectContains(
        "outside click closed the popup",
        dismissed,
        "open=false last=outside",
      );
    }),
};
