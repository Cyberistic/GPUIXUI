/** @jsxImportSource @gpuix/react */
import type { EventPayload, StyleDesc } from "@gpuix/react";
import * as Option from "effect/Option";
import { useRef, useState } from "react";
import { measuredBox, type MeasuredBox } from "./measure.js";

export interface SurfaceBox {
  readonly box: Option.Option<MeasuredBox>;

  readonly measure: (event: EventPayload) => void;

  readonly read: () => void;

  readonly nudge: number;

  readonly noteOrigin: (event: EventPayload) => void;
}

export const surfaceOriginStyle = (nudge: number): StyleDesc => ({
  position: "absolute",
  left: 0,
  top: 0,
  width: 1 + nudge,
  height: 1,
  pointerEvents: "none",
});

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
