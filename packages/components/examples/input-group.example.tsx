/** @jsxImportSource @gpuix/react */
import { Icon } from "@gpuixui/icons";
import { useTheme } from "../src/internal/theme.js";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "../src/input-group.js";

export const InputGroupExample = () => {
  const theme = useTheme();
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 16, width: 420 }}
    >
      <InputGroup label="Search" description="Files and people in this space.">
        <InputGroupInput placeholder="Search…" />
        <InputGroupAddon align="inline-start">
          <Icon name="search" size="sm" color={theme.colors.mutedForeground} />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <InputGroupText>⌘K</InputGroupText>
        </InputGroupAddon>
      </InputGroup>

      <InputGroup label="Website">
        <InputGroupInput placeholder="example.com" />
        <InputGroupAddon align="inline-start">
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
      </InputGroup>

      <InputGroup label="Note" error="A note is required.">
        <InputGroupAddon align="block-start">
          <InputGroupText>Markdown</InputGroupText>
        </InputGroupAddon>
        <InputGroupTextarea placeholder="What changed?" minRows={3} />
      </InputGroup>
    </div>
  );
};
