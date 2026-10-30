import { useEffect, useRef, useState } from "react";
import { alignLabel } from "./popover-alignment";
import {
  TOOLTIP_ALIGNMENTS,
  TOOLTIP_FRAME_WIDTH,
  TOOLTIP_TRIGGER_WIDTH,
  TOOLTIP_WIDTH,
  tooltipLayout,
  type TooltipAlign,
} from "./tooltip-alignment";
import {
  closedTip,
  describeTip,
  reducedTipTiming,
  tipAfter,
  tipTiming,
  type TipEvent,
  type TipState,
} from "./tooltip-preview";

/**
 * Browser previews for the Tooltip page.
 *
 * The shipped component wraps `@gpuix/react/tooltip`, so the clock below is the
 * runtime's, not a lookalike: hover opens at the provider's 0 ms delay, a
 * leaving pointer gets 80 ms to reach the tip, a press or Escape closes it and
 * it stays shut until the pointer leaves, and a `Tab` traversal never opens it
 * because a window does not run the trigger's `onFocus` (measured on 0.11.0).
 * The wrapper's own exit is here too: a closed tip is still painted for its
 * 160 ms tween, and `reducedMotion` removes it. The readout is the preview's
 * own, so a reader can watch the grace and the exit a screenshot cannot show.
 */

const tipContent = "Booked revenue, net of refunds.";

/** One trigger whose tip is driven by the preview's clock. */
const ClockedTip = ({ align }: { readonly align: TooltipAlign }) => {
  const [reduced, setReduced] = useState(false);
  const timing = reduced ? reducedTipTiming : tipTiming;
  // The page opens with its tip showing: a reader who never hovers still sees
  // the thing this preview is about. The clock owns it from the first leave.
  const [state, setState] = useState<TipState>({
    ...closedTip,
    open: true,
  });
  const layout = tooltipLayout(align);
  /** Whether the last focus arrived from a `Tab` rather than a pointer. */
  const tabbed = useRef(false);
  /** When the tip last closed, for the 300 ms reopen window. */
  const closedAt = useRef<number | null>(null);

  const send = (event: TipEvent): void =>
    setState((current) => {
      const next = tipAfter(current, event, timing);
      if (current.open && !next.open) closedAt.current = Date.now();
      return next;
    });

  /** The box is painted while open **and** while its exit runs. */
  const painted = state.open || state.leaving;

  useEffect(() => {
    if (state.timer === null) return;
    const timer = setTimeout(
      () => send({ type: "elapsed" }),
      state.timer.after,
    );
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Tab") tabbed.current = true;
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="gx-tip-stage" style={{ width: TOOLTIP_FRAME_WIDTH }}>
        <div className="gx-tip-anchor" style={{ marginLeft: layout.triggerX }}>
          <button
            aria-description={tipContent}
            className="gx-btn gx-btn-outline"
            onBlur={() => send({ type: "blur" })}
            onClick={() => send({ type: "press" })}
            onFocus={() => {
              if (tabbed.current) {
                tabbed.current = false;
                send({ type: "traversal" });
                return;
              }
              send({ type: "focus" });
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") send({ type: "escape" });
            }}
            onMouseDown={() => {
              tabbed.current = false;
              send({ type: "press" });
            }}
            onMouseEnter={() => {
              tabbed.current = false;
              const since = closedAt.current;
              send({
                type: "enter",
                recentlyClosed:
                  since !== null && Date.now() - since <= tipTiming.skipDelay,
              });
            }}
            onMouseLeave={() => send({ type: "leave" })}
            style={{ width: TOOLTIP_TRIGGER_WIDTH }}
            type="button"
          >
            Revenue definition
          </button>
          {painted ? (
            <span
              className={`gx-tip${state.leaving ? " gx-tip-leaving" : ""}${
                reduced ? " gx-tip-static" : ""
              }`}
              data-align={align}
              onMouseEnter={() => send({ type: "enter-tip" })}
              onMouseLeave={() => send({ type: "leave" })}
              role="tooltip"
              style={{ left: layout.offset, width: TOOLTIP_WIDTH }}
            >
              {tipContent}
            </span>
          ) : null}
        </div>
      </div>
      <p className="gx-tip-readout" role="status">
        tip <b>{describeTip(state, timing)}</b> · align=&quot;{align}&quot;
      </p>
      <button
        aria-pressed={reduced}
        className="gx-btn gx-btn-ghost gx-tip-motion"
        onClick={() => setReduced((current) => !current)}
        type="button"
      >
        {reduced ? "motion: reduced" : "motion: house timing"}
      </button>
    </>
  );
};

/** The two states a caller owns: `defaultOpen` and a controlled tip. */
const TipStates = () => {
  const [held, setHeld] = useState(false);

  return (
    <div className="gx-tooltip-demo gx-tooltip-states">
      <div className="gx-tip-anchor">
        <span className="gx-btn gx-btn-ghost">First run</span>
        <span className="gx-tip">Search the workspace</span>
      </div>
      <div className="gx-tip-anchor">
        <button
          aria-description="Pinned by the app."
          aria-expanded={held}
          className="gx-btn gx-btn-outline"
          onClick={() => setHeld((current) => !current)}
          type="button"
        >
          {held ? "Release the hint" : "Hold the hint"}
        </button>
        {held ? (
          <span className="gx-tip" role="tooltip">
            Pinned by the app.
          </span>
        ) : null}
      </div>
      <p className="gx-tip-readout">
        controlled <b>{held ? "open" : "closed"}</b>
      </p>
    </div>
  );
};

const tooltipSource = `import { Icon } from "@gpuixui/icons";
import { IconButton, Tooltip, useTheme } from "@gpuixui/primitives";

const theme = useTheme();

export const RevenueHelp = () => (
  <Tooltip content="Booked revenue, net of refunds." side="bottom" align="center">
    <IconButton
      icon={
        <Icon
          color={theme.colors.mutedForeground}
          name="info"
          size={theme.iconSize.sm}
        />
      }
      label="Revenue definition"
    />
  </Tooltip>
);`;

const tipStatesSource = `import { useState } from "react";
import { Button, Tooltip } from "@gpuixui/primitives";

export const Hints = () => {
  const [held, setHeld] = useState(false);

  return (
    <>
      {/* defaultOpen holds the first-run hint open with no interaction. */}
      <Tooltip content="Search the workspace" defaultOpen>
        <Button variant="ghost">First run</Button>
      </Tooltip>

      {/* A controlled tip paints only while open is true; the trigger still
          reports every request through onOpenChange. */}
      <Tooltip
        content="Pinned by the app."
        onOpenChange={setHeld}
        open={held}
      >
        <Button onActivate={() => setHeld((current) => !current)}>
          {held ? "Release the hint" : "Hold the hint"}
        </Button>
      </Tooltip>
    </>
  );
};`;

export const TooltipDemo = () => {
  const [align, setAlign] = useState<TooltipAlign>("center");

  return (
    <div className="gx-demo gx-demo-column gx-tooltip-scene">
      <div aria-label="Tooltip align" className="gx-tgroup" role="group">
        {TOOLTIP_ALIGNMENTS.map((name) => (
          <button
            aria-pressed={align === name}
            className="gx-btn gx-toggle gx-toggle-outline"
            data-pressed={align === name ? "" : undefined}
            key={name}
            onClick={() => setAlign(name)}
            type="button"
          >
            {alignLabel(name)}
          </button>
        ))}
      </div>
      <p className="gx-demo-label">Hover</p>
      <ClockedTip align={align} />
    </div>
  );
};

export const TooltipStates = () => (
  <div className="gx-demo gx-demo-column gx-tooltip-scene">
    <p className="gx-demo-label">Controlled</p>
    <TipStates />
  </div>
);

export { tipStatesSource, tooltipSource };
