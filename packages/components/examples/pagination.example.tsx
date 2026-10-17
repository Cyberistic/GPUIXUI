/**
 * Pagination example: a results footer driven by real page state.
 *
 * The component is controlled — `page` is the app's — which is what keeps the
 * rows below and the control in agreement when the rest of the screen also
 * changes the page.
 */

import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import {
  Pagination,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
} from "../src/pagination.js";

const TOTAL = 42;
const PER_PAGE = 5;
const PAGE_COUNT = Math.ceil(TOTAL / PER_PAGE);

/** A page worth of rows plus the control. */
export const PaginationExample = () => {
  const theme = useTheme();
  const [page, setPage] = useState(1);
  const first = (page - 1) * PER_PAGE;

  return (
    <Card style={{ maxWidth: 560 }}>
      <CardHeader>
        <CardTitle>Search results</CardTitle>
        <CardDescription>
          {TOTAL} results · showing {first + 1}–
          {Math.min(first + PER_PAGE, TOTAL)}
        </CardDescription>
      </CardHeader>
      <div
        style={{
          padding: theme.spacing.lg,
          paddingTop: 0,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.md,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.sm,
          }}
        >
          {[0, 1, 2, 3, 4].map((offset) => (
            <text
              key={offset}
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.foreground,
              }}
            >
              Result {first + offset + 1}
            </text>
          ))}
        </div>
        <Pagination
          testId="results-pagination"
          page={page}
          pageCount={PAGE_COUNT}
          onPageChange={setPage}
        >
          <PaginationPrevious />
          <PaginationList />
          <PaginationNext />
        </Pagination>
      </div>
    </Card>
  );
};
