/**
 * The box a pointer is read against, kept fresh when a layout above moves it.
 *
 * `onLayout` reports an element after its first paint and again when its **size**
 * changes — not when it is moved. A surface shifted by a pane opening or by a
 * scroll therefore keeps the box it last reported, and a pointer read against
 * its centre is off by the distance travelled: measured on 0.11.0, a box moved
 * 120 px by a padding change delivered no layout at all while the pointer's own
 * payload moved with it.
 *
 * The repair is a 1 px probe at the surface's origin. Alternating its width on
 * every pointer read makes the runtime lay it out again, so its report carries
 * the origin the surface has now; the box is that origin with the surface's own
 * measured size. The components derive their frame during render, so the report
 * itself corrects the paint — the pointer read that asked for it does not have to
 * be repeated.
 */

import type { EventPayload, StyleDesc } from "@gpuix/react";
import * as Option from "effect/Option";
import { useRef, useState } from "react";
import { measuredBox, type MeasuredBox } from "./measure.js";

/** What a surface hands its pointer-facing arithmetic. */
export interface SurfaceBox {
  /** The surface's box in window coordinates, `None` until it has painted. */
  readonly box: Option.Option<MeasuredBox>;
  /** The surface's own `onLayout`; compose it with the caller's handler. */
  readonly measure: (event: EventPayload) => void;
  /** Ask for a fresh origin: call once per pointer read. */
  readonly read: () => void;
  /** Whether the probe is one pixel wider this read, which is what forces the report. */
  readonly nudge: number;
  /** The probe's own `onLayout`; only the probe should call it. */
  readonly noteOrigin: (event: EventPayload) => void;
}

/** Where a surface's probe sits: its padded origin. */
export const surfaceOriginStyle = (nudge: number): StyleDesc => ({
  position: "absolute",
  left: 0,
  top: 0,
  width: 1 + nudge,
  height: 1,
  pointerEvents: "none",
});

/**
 * Track the box a pointer is read against, with an origin a move cannot stale.
 *
 * The box has no origin until the probe reports, and no size until the surface
 * does; a pointer read before either is a read the component ignores, the same
 * rule as an unmeasured surface. The probe's own size is deliberately not used
 * for the frame: it alternates for the report, and a pixel of flicker in a lean
 * or a pan is a frame the reader would see.
 */
export const useSurfaceBox = (): SurfaceBox => {
  const size = useRef<Option.Option<MeasuredBox>>(Option.none());
  const origin = useRef<Option.Option<MeasuredBox>>(Option.none());
  const [box, setBox] = useState<Option.Option<MeasuredBox>>(Option.none());
  const [nudge, setNudge] = useState(0);

  const publish = () => {
    setBox(
      Option.map(
        Option.all({ origin: origin.current, size: size.current }),
        ({ origin, size }) => ({
          x: origin.x,
          y: origin.y,
          width: size.width,
          height: size.height,
        }),
      ),
    );
  };

  const measure = (event: EventPayload) => {
    Option.match(measuredBox(event), {
      onNone: () => undefined,
      onSome: (next) => {
        size.current = Option.some(next);
        publish();
      },
    });
  };

  const noteOrigin = (event: EventPayload) => {
    Option.match(measuredBox(event), {
      onNone: () => undefined,
      onSome: (next) => {
        origin.current = Option.some(next);
        publish();
      },
    });
  };

  const read = () => setNudge((value) => (value === 0 ? 1 : 0));

  return { box, measure, read, nudge, noteOrigin };
};
