import { createTestRoot } from "@gpuix/react/testing";
import { lightTheme, platformTheme, type Theme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { describe, expect, it } from "vitest";
import { Table, TableBody, TableCell, TableRow } from "../table/table.js";

const rowStyle = (theme: Theme) => {
  const root = createTestRoot({ width: 600, height: 200 });
  root.render(
    <ThemeProvider theme={theme}>
      <Table>
        <TableBody>
          <TableRow testId="row" onClick={() => undefined}>
            <TableCell>Gon Freecss</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </ThemeProvider>,
  );
  root.renderer.flush();
  const style = root.renderer.findByTestId("row")?.style as
    | {
        readonly hover?: { readonly backgroundColor?: string | null };
        readonly active?: { readonly backgroundColor?: string };
      }
    | undefined;
  root.unmount();
  return style;
};

describe("an AppKit table row", () => {
  it("paints no hover wash, and still answers the press", () => {
    const style = rowStyle(platformTheme(lightTheme, "darwin"));

    expect(style?.hover?.backgroundColor ?? null).toBeNull();
    expect(style?.active?.backgroundColor).toBeDefined();
  });

  it("keeps the hover wash on a pointer theme", () => {
    expect(rowStyle(lightTheme)?.hover?.backgroundColor).toBe(
      lightTheme.colors.hover,
    );
  });
});
