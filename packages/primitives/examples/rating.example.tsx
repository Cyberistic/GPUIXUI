/**
 * Rating example: a review card.
 *
 * Two ratings in the roles they differ in — an interactive one the reader owns,
 * and a read-only one showing an aggregate. The summary is derived from the
 * interaction, so the card demonstrates the controlled API a review form uses.
 */

import { useState, type ReactElement } from "react";
import { Box, Rating, Separator, Stack, Text } from "../src/index.js";

/** A review card: rate the release, beside the aggregate rating. */
export const RatingExample = (): ReactElement => {
  const [score, setScore] = useState(0);

  return (
    <Box
      tone="card"
      padding="lg"
      radius="md"
      border
      testId="rating-example"
      style={{ width: 440 }}
    >
      <Stack direction="column" gap="md">
        <Text role="h3">Rate this release</Text>

        <Stack direction="row" align="center" justify="between" gap="md">
          <Stack direction="column" gap="2xs" grow>
            <Text role="label">Your rating</Text>
            <Text role="caption" tone="muted">
              {score === 0
                ? "Click a star, or use the arrow keys."
                : `You rated ${score} of 5.`}
            </Text>
          </Stack>
          <Rating
            testId="rating-example-your"
            label="Your rating"
            value={score}
            onChange={setScore}
          />
        </Stack>

        <Separator orientation="horizontal" />

        <Stack direction="row" align="center" justify="between" gap="md">
          <Stack direction="column" gap="2xs" grow>
            <Text role="label">Average of 128 reviews</Text>
            <Text role="caption" tone="muted">
              4.2 of 5
            </Text>
          </Stack>
          <Rating
            testId="rating-example-average"
            label="Average rating"
            value={4}
            readOnly
          />
        </Stack>
      </Stack>
    </Box>
  );
};
