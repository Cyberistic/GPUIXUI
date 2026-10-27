/** @jsxImportSource @gpuix/react */
/**
 * Hover card example: a mention that previews the person.
 *
 * Resting on the name opens the card after the delay, and the pointer may
 * travel into it to reach the action; focusing the name opens it at once, so a
 * keyboard reader can read the same card.
 */

import { Button } from "../src/internal/button.js";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../src/hover-card.js";

/** A paragraph with a previewable mention. */
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
