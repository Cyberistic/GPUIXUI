/**
 * `overlay-dialog` — an `<anchored>` popup that closes on Escape and outside
 * click.
 *
 * GPUix has no `z-index`; a deferred `<anchored>` layer paints above the tree,
 * which is what makes an overlay possible at all. Measured on this host (plan
 * `140` §4):
 *
 * - the `<anchored>` node paints **no surface of its own**, so
 *   `getElementBounds` is `null` for it and `onMouseDownOutside` on the
 *   `<anchored>` never fires. The handlers belong on the **content div inside**
 *   it, which is exactly what GPUix's own `FloatingLayer` does.
 * - Escape reaches the focused element's `onKeyDown`, so the popup content
 *   takes focus on open (`autoFocus`) and handles `escape` itself.
 *
 * Limitation: the `<anchored>` node has no focus method of its own. Native
 * focus is moved through the renderer (`renderer.focusElement`), which
 * `modal-focus-trap` measures: focus enters the modal, Tab stays inside, and
 * closing returns focus to the trigger. This probe deliberately keeps the
 * trigger focused and does not claim focus return.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { useTheme } from "@gpuixui/tokens/react";
import { Body, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

const OverlayProbe = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState("none");
  const close = (reason: string) => {
    setOpen(false);
    setLast(reason);
  };

  return (
    <div
      style={{
        width: 480,
        height: 320,
        backgroundColor: theme.colors.background,
      }}
    >
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
          backgroundColor: theme.colors.muted,
          hover: { backgroundColor: theme.colors.border },
        }}
      >
        <Body>open</Body>
      </div>
      <div style={{ marginTop: 8 }}>
        <Readout testId="overlay-readout">{`open=${open} last=${last}`}</Readout>
      </div>
      {open ? (
        <anchored deferred position={{ x: 60, y: 120 }} priority={1} occlude>
          <div
            testId="overlay-popup"
            tabIndex={0}
            autoFocus
            onMouseDownOutside={() => close("outside")}
            onKeyDown={(event) => {
              if (event.key === "escape") close("escape");
            }}
            style={{
              padding: 12,
              backgroundColor: theme.colors.card,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: 6,
            }}
          >
            <text style={{ color: theme.colors.foreground }}>popup open</text>
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
