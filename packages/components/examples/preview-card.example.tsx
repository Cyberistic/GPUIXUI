/** @jsxImportSource @gpuix/react */
import { Button } from "../src/internal/button.js";
import {
  PreviewCard,
  PreviewCardContent,
  PreviewCardTrigger,
} from "../src/preview-card.js";

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
