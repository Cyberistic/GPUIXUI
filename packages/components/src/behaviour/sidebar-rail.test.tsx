/**
 * Regression: the icon rail centred its rows only at shadcn's 48px. The header,
 * group and footer kept a fixed `p-2`, so a wider rail (one that clears
 * macOS's traffic lights, say) pushed every icon off its centre.
 */

import { describe, expect, it } from "vitest";
import { requireBounds, settleMotion } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "../sidebar.js";

const Row = ({ id }: { readonly id: string }) => (
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton testId={id} label={id} tooltip={id} />
    </SidebarMenuItem>
  </SidebarMenu>
);

const centre = (bounds: { readonly x: number; readonly width: number }) =>
  bounds.x + bounds.width / 2;

describe("the icon rail", () => {
  it.each([48, 72])("centres every block's rows in a %ipx rail", (rail) => {
    const root = renderComponent(
      <SidebarProvider collapsible="icon" defaultOpen={false} iconWidth={rail}>
        <Sidebar>
          <SidebarHeader>
            <Row id="header-row" />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <Row id="group-row" />
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <Row id="footer-row" />
          </SidebarFooter>
        </Sidebar>
      </SidebarProvider>,
    );
    settleMotion(root);

    const panel = requireBounds(root, "sidebar");
    expect(panel.width).toBe(rail);
    for (const id of ["header-row", "group-row", "footer-row"]) {
      expect(centre(requireBounds(root, id))).toBeCloseTo(centre(panel), 0);
    }
    root.unmount();
  });
});
