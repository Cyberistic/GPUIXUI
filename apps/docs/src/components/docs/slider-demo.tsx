/**
 * Browser preview for the Slider page.
 *
 * A slider is one value on a closed range, so the drawing drags and steps
 * through the primitive's **own** arithmetic (`@gpuixui/primitives/core`): a
 * pointer aims at a value with `pointerValue`, and an arrow, `PageUp`/`PageDown`,
 * `Home` and `End` go through `decideValueKey`. A drawing that only painted 62%
 * of a track showed a slider nobody ships.
 *
 * The Code tab shows the native usage.
 */

import { useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import * as Option from "effect/Option";
import {
  decideValueKey,
  pointerValue,
  type ValueRange,
} from "@gpuixui/primitives/core";

const RANGE: ValueRange = { min: 0, max: 100, step: 1 };

const Slider = ({
  label,
  value,
  onChange,
  disabled = false,
  invalid = false,
}: {
  readonly label: string;
  readonly value: number;
  readonly onChange?: (value: number) => void;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
}) => {
  const drag = useRef(false);

  const aim = (clientX: number, element: HTMLElement) =>
    pointerValue(clientX, element.getBoundingClientRect(), RANGE);

  const key = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const next = decideValueKey(value, RANGE, event.key.toLowerCase());
    if (Option.isNone(next)) return;
    event.preventDefault();
    onChange?.(next.value);
  };

  return (
    <div
      aria-label={label}
      aria-valuemax={RANGE.max}
      aria-valuemin={RANGE.min}
      aria-valuenow={value}
      aria-valuetext={`${value}%`}
      className="gx-slider"
      data-disabled={disabled ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      onClick={(event) => {
        if (!disabled) onChange?.(aim(event.clientX, event.currentTarget));
      }}
      onKeyDown={key}
      onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => {
        if (disabled) return;
        drag.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        onChange?.(aim(event.clientX, event.currentTarget));
      }}
      onPointerMove={(event) => {
        if (drag.current && !disabled)
          onChange?.(aim(event.clientX, event.currentTarget));
      }}
      onPointerUp={(event) => {
        drag.current = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
    >
      <span className="gx-slider-track">
        <span className="gx-slider-fill" style={{ width: `${value}%` }} />
      </span>
      <span
        aria-hidden="true"
        className="gx-slider-thumb"
        style={{ left: `${value}%` }}
      />
    </div>
  );
};

export const SliderDemo = () => {
  const [quality, setQuality] = useState(62);
  return (
    <div className="gx-demo gx-demo-column gx-slider-scene">
      <div className="gx-slider-block">
        <span className="gx-slider-readout">
          Quality · <b>{quality}%</b>
        </span>
        <Slider label="Quality" value={quality} onChange={setQuality} />
      </div>
      <div className="gx-slider-block" data-disabled>
        <span className="gx-slider-readout">Disabled · 30%</span>
        <Slider disabled label="Disabled" value={30} />
      </div>
    </div>
  );
};

const sliderDemoSource = `import { Slider, Stack, Text } from "@gpuixui/primitives";
import { useState } from "react";

const [quality, setQuality] = useState(62);

<Stack direction="column" gap="sm">
  <Text role="caption" tone="muted">Quality · {quality}%</Text>
  <Slider
    label="Quality"
    value={quality}
    onValueChange={setQuality}
    formatValue={(value) => \`\${value}%\`}
  />
</Stack>;

<Slider label="Disabled" value={30} disabled />;`;

export { sliderDemoSource };
