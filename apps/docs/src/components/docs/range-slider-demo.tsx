/**
 * Browser preview for the RangeSlider page.
 *
 * A range is two ends of one interval on a single track, and the drawing drags
 * them with the primitive's **own** arithmetic: a press aims at a value with
 * `pointerValue`, `nearestEnd` says which thumb it grabbed, and `dragSpan` keeps
 * the ends from crossing — including the coincident pair a price filter opens
 * with. Each thumb steps with `decideValueKey` and `moveSpanEnd`, so the
 * keyboard moves one end and never the pair.
 *
 * The Code tab shows the native usage.
 */

import {
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import * as Option from "effect/Option";
import {
  decideValueKey,
  moveSpanEnd,
  nearestEnd,
  pointerValue,
  type ValueRange,
  type ValueSpan,
} from "@gpuixui/primitives/core";
import { dragSpan, type SpanDrag } from "./slider-preview";

const RANGE: ValueRange = { min: 0, max: 100, step: 5 };

const money = (span: ValueSpan) => `$${span.start} – $${span.end}`;
const percent = (value: number) => `${value}%`;

const RangeSlider = ({
  label,
  span,
  onChange,
  invalid = false,
}: {
  readonly label: string;
  readonly span: ValueSpan;
  readonly onChange?: (span: ValueSpan) => void;
  readonly invalid?: boolean;
}) => {
  const drag = useRef<SpanDrag | null>(null);

  const aim = (clientX: number, element: HTMLElement) =>
    pointerValue(clientX, element.getBoundingClientRect(), RANGE);

  const grab = (clientX: number, element: HTMLElement) => {
    const value = aim(clientX, element);
    drag.current = { end: nearestEnd(value, span), point: value };
    onChange?.(dragSpan(drag.current, span, value, RANGE));
  };

  const key = (end: "start" | "end") => (event: ReactKeyboardEvent) => {
    const next = decideValueKey(span[end], RANGE, event.key.toLowerCase());
    if (Option.isNone(next)) return;
    event.preventDefault();
    onChange?.(moveSpanEnd(span, end, next.value, RANGE));
  };

  return (
    <div
      aria-label={label}
      className="gx-slider"
      data-invalid={invalid ? "" : undefined}
      role="group"
      onClick={(event) => grab(event.clientX, event.currentTarget)}
      onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        grab(event.clientX, event.currentTarget);
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (current === null) return;
        onChange?.(
          dragSpan(
            current,
            span,
            aim(event.clientX, event.currentTarget),
            RANGE,
          ),
        );
      }}
      onPointerUp={(event) => {
        drag.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
    >
      <span className="gx-slider-track">
        <span
          className="gx-slider-fill"
          style={{
            left: percent(span.start),
            width: percent(span.end - span.start),
          }}
        />
      </span>
      {(["start", "end"] as const).map((end) => (
        <button
          aria-label={`${label} ${end === "start" ? "from" : "to"}`}
          aria-valuemax={RANGE.max}
          aria-valuemin={RANGE.min}
          aria-valuenow={span[end]}
          aria-valuetext={`${span[end]}`}
          className="gx-slider-thumb"
          key={end}
          role="slider"
          style={{ left: percent(span[end]) }}
          type="button"
          onKeyDown={key(end)}
        />
      ))}
    </div>
  );
};

export const RangeSliderDemo = () => {
  const [price, setPrice] = useState<ValueSpan>({ start: 20, end: 80 });
  return (
    <div className="gx-demo gx-demo-column gx-slider-scene">
      <div className="gx-slider-block">
        <span className="gx-slider-readout">
          Budget · <b>{money(price)}</b>
        </span>
        <RangeSlider label="Budget" onChange={setPrice} span={price} />
      </div>
      <div className="gx-slider-block" data-invalid>
        <span className="gx-slider-readout gx-slider-invalid">
          Invalid · {money({ start: 40, end: 60 })}
        </span>
        <RangeSlider invalid label="Invalid" span={{ start: 40, end: 60 }} />
      </div>
    </div>
  );
};

const rangeSliderDemoSource = `import { RangeSlider, Stack, Text } from "@gpuixui/primitives";
import { useState } from "react";

const [price, setPrice] = useState<readonly [number, number]>([20, 80]);

<Stack direction="column" gap="sm">
  <Text role="caption" tone="muted">\${price[0]} – \${price[1]}</Text>
  <RangeSlider
    label="Budget"
    value={price}
    onValueChange={setPrice}
    step={5}
    formatValue={(value) => \`\${value}\`}
  />
</Stack>;

<RangeSlider label="Invalid" value={[40, 60]} invalid />;`;

export { rangeSliderDemoSource };
