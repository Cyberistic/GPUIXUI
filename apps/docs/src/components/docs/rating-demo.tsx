/**
 * Browser preview for the Rating page.
 *
 * A score is pressed on a star, and the drawing rates through the primitive's
 * **own** arithmetic: `rateAt` reads the half of the star the press landed in
 * (`pointerRating`) and the keyboard steps with `decideRating`, where Delete and
 * Backspace are the only way back to zero. The old drawing printed "press a
 * star to rate" beside stars that took no press, and offered a row of number
 * buttons instead.
 *
 * The Code tab shows the native usage.
 */

import { useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import * as Option from "effect/Option";
import { decideRating, starCount, starState } from "@gpuixui/primitives/core";
import { rateAt } from "./rating-preview";

const MAX = 5;

const Star = ({
  state,
  onPress,
  label,
}: {
  readonly state: "checked" | "half" | "unchecked";
  readonly onPress?: (element: HTMLElement, clientX: number) => void;
  readonly label?: string;
}) =>
  onPress === undefined ? (
    <span
      aria-hidden="true"
      className="gx-rating-star"
      data-half={state === "half" ? "" : undefined}
      data-filled={state === "checked" ? "" : undefined}
    >
      ★
    </span>
  ) : (
    <button
      aria-label={label}
      className="gx-rating-star"
      data-filled={state === "checked" ? "" : undefined}
      data-half={state === "half" ? "" : undefined}
      type="button"
      onClick={(event) => onPress(event.currentTarget, event.clientX)}
    >
      ★
    </button>
  );

const Stars = ({ value }: { readonly value: number }) => (
  <span className="gx-rating" role="img" aria-label={`${value} of ${MAX}`}>
    {Array.from({ length: MAX }, (_, index) => (
      <Star key={index} state={starState(index + 1, value)} />
    ))}
  </span>
);

export const RatingDemo = () => {
  const [value, setValue] = useState(3.5);

  const rate = (star: number, element: HTMLElement, clientX: number) =>
    setValue(rateAt(star, clientX, element.getBoundingClientRect(), true));

  const key = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const next = decideRating(value, MAX, event.key.toLowerCase(), true);
    if (Option.isNone(next)) return;
    event.preventDefault();
    setValue(next.value);
  };

  return (
    <div className="gx-demo gx-demo-column gx-rating-scene">
      <div className="gx-rating-block">
        <div
          className="gx-rating"
          onKeyDown={key}
          role="group"
          aria-label="Rate this"
        >
          {Array.from({ length: starCount(MAX) }, (_, index) => (
            <Star
              key={index}
              label={`Rate ${index + 1} of ${MAX}`}
              state={starState(index + 1, value)}
              onPress={(element, clientX) => rate(index + 1, element, clientX)}
            />
          ))}
        </div>
        <span className="gx-rating-readout">
          {value === 0 ? "Not rated" : `${value} of ${MAX}`}
        </span>
        <div className="gx-demo-row">
          <button
            className="gx-btn gx-btn-sm gx-btn-outline"
            onClick={() => setValue(0)}
            type="button"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="gx-rating-block">
        <Stars value={0} />
        <span className="gx-rating-readout">Read only</span>
      </div>
    </div>
  );
};

const ratingDemoSource = `import { Rating, Stack, Text } from "@gpuixui/primitives";
import { useState } from "react";

const [score, setScore] = useState(3.5);

<Stack direction="column" gap="sm">
  <Text role="caption" tone="muted">{score === 0 ? "Not rated" : \`\${score} of 5\`}</Text>
  <Rating
    label="Rate this"
    value={score}
    onValueChange={setScore}
    half
  />
</Stack>;

<Rating label="Read only" value={4.5} halves readOnly />;`;

export { ratingDemoSource };
