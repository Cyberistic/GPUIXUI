/**
 * Browser preview for the Rating page.
 *
 * A rating is a score in stars, whole or in halves. The preview draws a
 * half-star score, a cleared state and a read-only display. The Code tab shows
 * the native usage.
 */

import { useState } from "react";

const Star = ({
  filled,
  half = false,
}: {
  readonly filled: boolean;
  readonly half?: boolean;
}) => (
  <span
    aria-hidden="true"
    className="gx-rating-star"
    data-filled={filled ? "" : undefined}
    data-half={half ? "" : undefined}
  >
    ★
  </span>
);

const Stars = ({ value }: { readonly value: number }) => (
  <span className="gx-rating" role="img" aria-label={`${value} of 5`}>
    {[0, 1, 2, 3, 4].map((index) => (
      <Star filled={index < value} half={value - index === 0.5} key={index} />
    ))}
  </span>
);

export const RatingDemo = () => {
  const [value, setValue] = useState(3.5);
  return (
    <div className="gx-demo gx-demo-column gx-rating-scene">
      <div className="gx-rating-block">
        <Stars value={value} />
        <span className="gx-rating-readout">
          {value === 0 ? "Not rated" : `${value} of 5`} — press a star to rate
        </span>
        <div className="gx-demo-row">
          {[0, 1, 2, 3, 4, 5].map((score) => (
            <button
              aria-pressed={value === score}
              className="gx-btn gx-btn-sm gx-btn-outline"
              key={score}
              onClick={() => setValue(score)}
              type="button"
            >
              {score === 0 ? "Clear" : score}
            </button>
          ))}
        </div>
      </div>
      <div className="gx-rating-block">
        <Stars value={0} />
        <span className="gx-rating-readout">
          Cleared — Delete or Backspace clears
        </span>
      </div>
    </div>
  );
};

const ratingDemoSource = `import { Rating, Stack, Text } from "@gpuixui/primitives";
import { useState } from "react";

const [score, setScore] = useState(0);

<Stack direction="column" gap="xs">
  <Rating label="Quality" value={score} onValueChange={setScore} />
  <Text role="caption" tone="muted">
    {score === 0 ? "Not rated" : \`\${score} of 5\`}
  </Text>
</Stack>;

// Halves are the finest score; allowHalf rounds to the nearer half.
<Rating label="Quality" value={3.5} allowHalf />;
<Rating label="Quality" value={4} readOnly />;`;

export { ratingDemoSource };
