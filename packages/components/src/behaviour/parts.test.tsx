/**
 * Typed-by-position children, in the real GPUix renderer.
 *
 * The bug these guard: a part used inside the wrong parent of its own component
 * (`TabsContent` inside `TabsList`, `AlertTitle` directly in `Alert`, …) used to
 * mount silently and paint in the wrong place. Every parent in the family now
 * rejects it at render with a message naming both sides.
 *
 * React 19 typechecks every JSX child as `ReactElement<any, any>`, so this cannot
 * be a compile error (measured, plan 304 §2). The renderer propagates the throw
 * to a class error boundary, which is the only way to observe it: without one,
 * React reports the error to `console.error` and the test would race it.
 */

import { Component, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { Accordion, AccordionContent } from "../accordion.js";
import { Alert, AlertContent, AlertDismiss, AlertTitle } from "../alert.js";
import { Breadcrumb, BreadcrumbLink, BreadcrumbList } from "../breadcrumb.js";
import { DatePicker, DatePickerCalendar } from "../date-picker.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../dropdown-menu.js";
import { Pagination, PaginationList, PaginationNext } from "../pagination.js";
import { renderComponent } from "../internal/test-root.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs.js";

/** Catches the render throw and paints the message as text. */
class Caught extends Component<
  { readonly children?: ReactNode },
  { readonly message: string | null }
> {
  state: { readonly message: string | null } = { message: null };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }

  render() {
    return this.state.message === null ? (
      this.props.children
    ) : (
      <text testId="caught">{this.state.message}</text>
    );
  }
}

/** Render `node` under the boundary and return what the user would see. */
const caught = (node: ReactNode): string => {
  const root = renderComponent(<Caught>{node}</Caught>);
  const text = root.renderer.getAllText();
  root.unmount();
  return text.join("\n");
};

describe("part positions", () => {
  it("rejects TabsContent inside TabsList", () => {
    expect(
      caught(
        <Tabs defaultValue="a">
          <TabsList>
            <TabsContent value="a">Panel</TabsContent>
          </TabsList>
        </Tabs>,
      ),
    ).toContain("TabsContent cannot be used inside TabsList");
  });

  it("rejects AccordionContent directly in Accordion", () => {
    expect(
      caught(
        <Accordion type="single">
          <AccordionContent>Body</AccordionContent>
        </Accordion>,
      ),
    ).toContain("AccordionContent cannot be used inside Accordion");
  });

  it("rejects BreadcrumbLink directly in BreadcrumbList", () => {
    expect(
      caught(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbLink onSelect={() => undefined}>Home</BreadcrumbLink>
          </BreadcrumbList>
        </Breadcrumb>,
      ),
    ).toContain("BreadcrumbLink cannot be used inside BreadcrumbList");
  });

  it("rejects AlertDismiss inside AlertContent", () => {
    expect(
      caught(
        <Alert>
          <AlertContent>
            <AlertTitle>Heads up</AlertTitle>
            <AlertDismiss onDismiss={() => undefined} />
          </AlertContent>
        </Alert>,
      ),
    ).toContain("AlertDismiss cannot be used inside AlertContent");
  });

  it("rejects DropdownMenuTrigger inside DropdownMenuContent", () => {
    expect(
      caught(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent label="Actions">
            <DropdownMenuTrigger>Nested</DropdownMenuTrigger>
          </DropdownMenuContent>
        </DropdownMenu>,
      ),
    ).toContain(
      "DropdownMenuTrigger cannot be used inside DropdownMenuContent",
    );
  });

  it("rejects DatePickerCalendar directly in DatePicker", () => {
    expect(
      caught(
        <DatePicker today="2026-10-17">
          <DatePickerCalendar />
        </DatePicker>,
      ),
    ).toContain("DatePickerCalendar cannot be used inside DatePicker");
  });

  it("renders valid compositions without a false positive", () => {
    const text = caught(
      <div>
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">A</TabsTrigger>
          </TabsList>
          <TabsContent value="a">Panel A</TabsContent>
        </Tabs>
        <Pagination page={1} pageCount={3} onPageChange={() => undefined}>
          <PaginationList />
          <PaginationNext />
        </Pagination>
      </div>,
    );

    expect(text).toContain("Panel A");
    expect(text).not.toContain("cannot be used inside");
  });
});
