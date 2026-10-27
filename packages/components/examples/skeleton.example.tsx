/** @jsxImportSource @gpuix/react */
/**
 * Skeleton example: a card whose content has not arrived.
 *
 * The blocks reserve the box the real content will paint: a caption line, two
 * body lines and an avatar circle. The last line keeps its still frame, the
 * shape a reduced-motion preference asks for.
 */

import { Card } from "../src/card.js";
import { useTheme } from "../src/internal/theme.js";
import { Skeleton } from "../src/skeleton.js";

/** The loading shape of a profile card. */
export const SkeletonExample = () => {
  const theme = useTheme();
  return (
    <Card style={{ maxWidth: 420 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.lg,
          padding: theme.spacing.xl,
        }}
      >
        <Skeleton circle width={40} height={40} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.sm,
            flexGrow: 1,
          }}
        >
          <Skeleton width="45%" height={14} />
          <Skeleton width="70%" height={14} />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.sm,
          padding: theme.spacing.xl,
          paddingTop: 0,
        }}
      >
        <Skeleton height={12} />
        <Skeleton height={12} width="80%" />
        <Skeleton height={12} width="60%" animate={false} />
      </div>
    </Card>
  );
};
