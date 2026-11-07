/** @jsxImportSource @gpuix/react */
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../src/collapsible.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

const Option = ({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        {label}
      </text>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {value}
      </text>
    </div>
  );
};

export const CollapsibleExample = () => {
  const theme = useTheme();
  return (
    <Card style={{ maxWidth: 460 }}>
      <CardHeader>
        <CardTitle>Run task</CardTitle>
        <CardDescription>Build the components package</CardDescription>
      </CardHeader>
      <div style={{ padding: theme.spacing.lg, paddingTop: 0 }}>
        <Option label="Command" value="nub run build" />
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger testId="advanced">
            Advanced options
          </CollapsibleTrigger>
          <CollapsibleContent testId="advanced-content">
            <Option label="Retry budget" value="3 attempts" />
            <Option label="Timeout" value="120 s" />
            <Option label="Working directory" value="packages/components" />
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Card>
  );
};
