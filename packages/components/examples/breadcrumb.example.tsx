/**
 * Breadcrumb example: a deep path that collapses its middle.
 *
 * `maxItems={3}` keeps the project and the current page and replaces the rest
 * with an ellipsis; the links below the trail show which one was chosen.
 */

import { useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../src/breadcrumb.js";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

/** A path trail whose links report where they would navigate. */
export const BreadcrumbExample = () => {
  const theme = useTheme();
  const [chosen, setChosen] = useState("none");

  return (
    <Card style={{ maxWidth: 560 }}>
      <CardHeader>
        <CardTitle>Current location</CardTitle>
        <CardDescription>Last chosen: {chosen}</CardDescription>
      </CardHeader>
      <div style={{ padding: theme.spacing.lg, paddingTop: 0 }}>
        <Breadcrumb maxItems={3}>
          <BreadcrumbList testId="trail">
            <BreadcrumbItem>
              <BreadcrumbLink onSelect={() => setChosen("Projects")}>
                Projects
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink onSelect={() => setChosen("GPUIXUI")}>
                GPUIXUI
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink onSelect={() => setChosen("packages")}>
                packages
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>components</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
            marginTop: theme.spacing.md,
          }}
        >
          The middle two entries are hidden because the budget is three.
        </text>
      </div>
    </Card>
  );
};
