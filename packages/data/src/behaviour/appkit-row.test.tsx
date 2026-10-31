/**
 * A table row under the AppKit interaction (plan 724).
 *
 * Bug guarded: on macOS a clickable table row painted the web's hover wash,
 * where an AppKit table answers the press and not a pointer crossing it; the
 * press must still repaint, and every pointer theme must keep its hover.
 */
import { createTestRoot } from "@gpuix/react/testing";
import { lightTheme, platformTheme, type Theme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { describe, expect, it } from "vitest";
import { Table, TableBody, TableCell, TableRow } from "../table/table.js";

/** The row's declared state records, rendered under `theme`. */
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
    // The runtime reports a cleared state fill as `null`.
    expect(style?.hover?.backgroundColor ?? null).toBeNull();
    expect(style?.active?.backgroundColor).toBeDefined();
  });

  it("keeps the hover wash on a pointer theme", () => {
    expect(rowStyle(lightTheme)?.hover?.backgroundColor).toBe(
      lightTheme.colors.hover,
    );
  });
});
