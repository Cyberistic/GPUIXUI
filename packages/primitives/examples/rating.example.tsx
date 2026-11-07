/** @jsxImportSource @gpuix/react */
import { useState, type ReactElement } from "react";
import { Box, Rating, Separator, Stack, Text } from "../src/index.js";

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
                ? "Click a star — or its left half — or use the arrow keys."
                : `You rated ${score} of 5.`}
            </Text>
          </Stack>
          <Rating
            testId="rating-example-your"
            label="Your rating"
            allowHalf
            value={score}
            onChange={setScore}
          />
        </Stack>

        <Separator orientation="horizontal" />

        <Stack direction="row" align="center" justify="between" gap="md">
          <Stack direction="column" gap="2xs" grow>
            <Text role="label">Average of 128 reviews</Text>
            <Text role="caption" tone="muted">
              4.5 of 5
            </Text>
          </Stack>
          <Rating
            testId="rating-example-average"
            label="Average rating"
            allowHalf
            value={4.5}
            readOnly
          />
        </Stack>
      </Stack>
    </Box>
  );
};
