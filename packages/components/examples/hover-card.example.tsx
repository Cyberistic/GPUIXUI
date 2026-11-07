/** @jsxImportSource @gpuix/react */
import { Button } from "../src/internal/button.js";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../src/hover-card.js";

export const HoverCardExample = () => (
  <div
    style={{ display: "flex", flexDirection: "column", gap: 12, width: 420 }}
  >
    <div style={{ display: "flex", flexDirection: "row", gap: 4 }}>
      <text>Assigned to</text>
      <HoverCard>
        <HoverCardTrigger>@ada</HoverCardTrigger>
        <HoverCardContent label="Ada Lovelace">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <text>Ada Lovelace</text>
            <text>Mathematician · Analytical Engine</text>
            <Button size="sm" variant="secondary">
              Open profile
            </Button>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
    <text>Hover or focus the name to preview the profile.</text>
  </div>
);
