/** @jsxImportSource @gpuix/react */
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../src/card.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

const Row = ({
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
        alignItems: "center",
        justifyContent: "space-between",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.mutedForeground,
        }}
      >
        {label}
      </text>
      <text
        style={{
          ...textStyle(theme, "bodyStrong"),
          color: theme.colors.foreground,
        }}
      >
        {value}
      </text>
    </div>
  );
};

export const CardExample = () => (
  <Card style={{ maxWidth: 420 }}>
    <CardHeader>
      <CardTitle>Pro plan</CardTitle>
      <CardDescription>
        Everything in Starter, plus seats and invoicing.
      </CardDescription>
      <CardDescription>Renews on 1 November.</CardDescription>
    </CardHeader>
    <CardContent>
      <Row label="Seats" value="12 of 20" />
      <Row label="Storage" value="184 GB" />
      <Row label="Invoices" value="Enabled" />
    </CardContent>
    <CardFooter>
      <text>Manage billing</text>
      <text>Cancel plan</text>
    </CardFooter>
  </Card>
);
