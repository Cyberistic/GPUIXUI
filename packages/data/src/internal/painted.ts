import type { EventPayload, StyleDesc } from "@gpuix/react";
import * as Option from "effect/Option";
import { useCallback, useState } from "react";
import { paintableSize } from "./size.js";

export interface PaintedHeight {
  readonly measured: Option.Option<number>;

  readonly onLayout: (event: EventPayload) => void;
}

export const usePaintedHeight = (
  onLayout: ((event: EventPayload) => void) | undefined,
): PaintedHeight => {
  const [measured, setMeasured] = useState<Option.Option<number>>(
    Option.none(),
  );
  const report = useCallback(
    (event: EventPayload) => {
      onLayout?.(event);
      Option.match(paintableSize(event.height), {
        onNone: () => {},
        onSome: (height) =>
          setMeasured((current) =>
            Option.contains(current, height) ? current : Option.some(height),
          ),
      });
    },
    [onLayout],
  );
  return { measured, onLayout: report };
};

export const paneFill: (height: Option.Option<number>) => StyleDesc =
  Option.match({
    onNone: () => ({
      display: "flex",
      flexDirection: "column",
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      minHeight: 0,
    }),
    onSome: () => ({}),
  });
