/**
 * EmptyState example: a collection with nothing in it, twice.
 *
 * The first panel is the "never had anything" case with a way forward; the second
 * is the "your filters excluded everything" case, where the action clears them.
 * Both live inside a `Card`, because an empty state paints no surface of its own.
 */

import { useState } from "react";
import { Button } from "../src/internal/button.js";
import { Card, CardHeader, CardTitle } from "../src/card.js";
import { EmptyState } from "../src/empty-state.js";
import { useTheme } from "../src/internal/theme.js";

/** A project list with nothing in it, and a filter with no matches. */
export const EmptyStateExample = () => {
  const theme = useTheme();
  const [filtered, setFiltered] = useState(true);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing["2xl"],
        maxWidth: 520,
      }}
    >
      <Card>
        <EmptyState
          testId="no-projects"
          title="No projects yet"
          description="A project holds your files, runs and settings. Create one to get started."
          action={
            <Button variant="primary" onClick={() => undefined}>
              New project
            </Button>
          }
        />
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Runs</CardTitle>
        </CardHeader>
        {filtered ? (
          <EmptyState
            testId="no-matches"
            title="No runs match “failed”"
            description="Try a different status, or clear the filter."
            action={
              <Button onClick={() => setFiltered(false)}>Clear filter</Button>
            }
          />
        ) : (
          <EmptyState
            testId="no-runs"
            title="No runs yet"
            description="Runs appear here once a workflow completes."
          />
        )}
      </Card>
    </div>
  );
};
