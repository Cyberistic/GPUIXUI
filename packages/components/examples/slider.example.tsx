/** @jsxImportSource @gpuix/react */
/**
 * Slider example: one value and a price range.
 *
 * The same component takes a number or a pair, so a settings pane and a filter
 * read as one surface rather than two names a caller has to know.
 */

import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import { isSliderSpan, Slider, type SliderValue } from "../src/slider.js";

/** A settings card with a quality bar and a price filter. */
export const SliderExample = () => {
  const theme = useTheme();
  const [quality, setQuality] = useState(72);
  const [price, setPrice] = useState<readonly [number, number]>([20, 80]);

  const readout = (value: SliderValue): string =>
    isSliderSpan(value) ? `${value[0]} – ${value[1]}` : String(value);

  return (
    <Card style={{ maxWidth: 420 }}>
      <CardHeader>
        <CardTitle>Export</CardTitle>
        <CardDescription>Quality and a filtered price range</CardDescription>
      </CardHeader>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
          padding: theme.spacing.xl,
          paddingTop: theme.spacing.xs,
        }}
      >
        <Slider
          label="Quality"
          value={quality}
          onValueChange={(next) =>
            setQuality(typeof next === "number" ? next : next[0])
          }
          formatValue={(value) => `${value}%`}
        />
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          Quality · {readout(quality)}%
        </text>
        <Slider
          label="Price"
          value={price}
          min={0}
          max={200}
          step={5}
          onValueChange={(next) => {
            if (isSliderSpan(next)) setPrice(next);
          }}
        />
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          Price · ${readout(price)}
        </text>
      </div>
    </Card>
  );
};
