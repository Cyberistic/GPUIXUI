/**
 * Preview card example: a document link that previews its content.
 *
 * The card is hoverable, so it holds a real action rather than only text. The
 * delays are the defaults here (300 ms open, 150 ms close).
 */

import { Button } from "../src/internal/button.js";
import {
  PreviewCard,
  PreviewCardContent,
  PreviewCardTrigger,
} from "../src/preview-card.js";

/** A file reference with a preview and an action. */
export const PreviewCardExample = () => (
  <div
    style={{ display: "flex", flexDirection: "column", gap: 24, width: 360 }}
  >
    <PreviewCard>
      <PreviewCardTrigger>design-system.md</PreviewCardTrigger>
      <PreviewCardContent label="design-system.md">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <text>Design system</text>
          <text>Tokens, semantic roles and the theme extension mechanism.</text>
          <Button size="sm" variant="primary">
            Open file
          </Button>
        </div>
      </PreviewCardContent>
    </PreviewCard>

    <PreviewCard>
      <PreviewCardTrigger>contributing.md</PreviewCardTrigger>
      <PreviewCardContent label="contributing.md">
        <text>How to add a component and keep the gates green.</text>
      </PreviewCardContent>
    </PreviewCard>
  </div>
);
