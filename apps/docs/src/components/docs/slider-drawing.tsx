/**
 * The browser drawing of a slider: one value, or the two ends of a range.
 *
 * Every decision the drawing makes is the primitive's
 * (`@gpuixui/primitives/core`): a press aims at a value with `pointerValue`, a
 * pair asks `nearestEnd` which thumb it grabbed, a drag draws through
 * `dragSpan`, and a key goes through `decideValueKey`. The shipped track pads
 * itself by half a thumb and measures the press against the padded span; the
 * drawing does the same, so a press lands on the thumb it looks like it landed
 * on.
 *
 * A pointer that leaves the rail keeps reporting: the press captures the
 * pointer on the track, which is the browser's version of the runtime's
 * `mouseDown` + `mouseMove` capture.
 */

import {
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import * as Option from "effect/Option";
import {
  decideValueKey,
  moveSpanEnd,
  nearestEnd,
  pointerValue,
  valueFraction,
  type ValueRange,
  type ValueSpan,
} from "@gpuixui/primitives/core";
import {
  dragSpan,
  trackPaint,
  valueKey,
  type SpanDrag,
} from "./slider-preview";

interface SliderDrawingProps {
  /** The group's name, and the base of each thumb's name in a range. */
  readonly label: string;
  /** One number for a slider, two for the ends of a range. */
  readonly values: ReadonlyArray<number>;
  readonly range: ValueRange;
  readonly onChange?: (values: ReadonlyArray<number>) => void;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
}

const percent = (fraction: number): string => `${fraction * 100}%`;
const ends = ["start", "end"] as const;

/** The drawing: a rail, a fill and one thumb per value. */
export const SliderDrawing = ({
  label,
  values,
  range,
  onChange,
  disabled = false,
  invalid = false,
}: SliderDrawingProps) => {
  const rail = useRef<HTMLSpanElement>(null);
  const drag = useRef<SpanDrag | null>(null);
  const pair = values.length === 2;
  const span: ValueSpan = {
    start: values[0] ?? range.min,
    end: values[1] ?? values[0] ?? range.min,
  };
  const paint = trackPaint(values, range);

  const aim = (clientX: number): Option.Option<number> => {
    const box = rail.current?.getBoundingClientRect();
    return box === undefined
      ? Option.none()
      : Option.some(pointerValue(clientX, box, range));
  };

  const press = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    Option.match(aim(event.clientX), {
      onNone: () => {},
      onSome: (value) => {
        if (!pair) {
          drag.current = { end: "end", point: value };
          onChange?.([value]);
          return;
        }
        drag.current = { end: nearestEnd(value, span), point: value };
        const next = dragSpan(drag.current, span, value, range);
        onChange?.([next.start, next.end]);
      },
    });
  };

  const move = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const gesture = drag.current;
    if (gesture === null || disabled) return;
    Option.match(aim(event.clientX), {
      onNone: () => {},
      onSome: (value) => {
        if (!pair) {
          onChange?.([value]);
          return;
        }
        const next = dragSpan(gesture, span, value, range);
        onChange?.([next.start, next.end]);
      },
    });
  };

  const release = (event: ReactPointerEvent<HTMLDivElement>): void => {
    drag.current = null;
    // A pointer the window lost its grip on (a cancel, a release outside the
    // window) is no longer captured, and releasing it again throws.
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  /** A key on the single value, or on one end of the range. */
  const key =
    (end: "start" | "end") =>
    (event: ReactKeyboardEvent<HTMLElement>): void => {
      if (disabled) return;
      const current = pair ? span[end] : span.start;
      Option.match(decideValueKey(current, range, valueKey(event.key)), {
        onNone: () => {},
        onSome: (value) => {
          event.preventDefault();
          if (!pair) {
            onChange?.([value]);
            return;
          }
          const next = moveSpanEnd(span, end, value, range);
          onChange?.([next.start, next.end]);
        },
      });
    };

  return (
    <div
      aria-label={label}
      aria-valuemax={pair ? undefined : range.max}
      aria-valuemin={pair ? undefined : range.min}
      aria-valuenow={pair ? undefined : span.start}
      aria-valuetext={pair ? undefined : String(span.start)}
      className="gx-slider"
      data-disabled={disabled ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      onKeyDown={pair ? undefined : key("start")}
      onPointerDown={press}
      onPointerMove={move}
      onPointerUp={release}
      role={pair ? "group" : "slider"}
      tabIndex={disabled || pair ? -1 : 0}
    >
      <span className="gx-slider-rail" ref={rail}>
        <span className="gx-slider-track">
          <span
            className="gx-slider-fill"
            style={{ left: percent(paint.left), width: percent(paint.width) }}
          />
        </span>
        {pair ? (
          ends.map((end) => (
            <button
              aria-label={`${label} ${end === "start" ? "minimum" : "maximum"}`}
              aria-valuemax={range.max}
              aria-valuemin={range.min}
              aria-valuenow={span[end]}
              aria-valuetext={String(span[end])}
              className="gx-slider-thumb"
              key={end}
              onKeyDown={key(end)}
              role="slider"
              style={{ left: percent(valueFraction(span[end], range)) }}
              tabIndex={disabled ? -1 : 0}
              type="button"
            />
          ))
        ) : (
          <span
            aria-hidden="true"
            className="gx-slider-thumb"
            style={{ left: percent(valueFraction(span.start, range)) }}
          />
        )}
      </span>
    </div>
  );
};
