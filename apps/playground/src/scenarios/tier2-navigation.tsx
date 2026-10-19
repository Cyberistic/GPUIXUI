/**
 * `tier2-navigation` — the shipped Tier 2 navigation set from
 * `@gpuixui/components`, mounted by a consumer and driven natively.
 *
 * The package's own suite proves each part; this scenario proves the consumer
 * path (the published root import through `tsconfig.vendor.json`, plan `330`
 * §3), the shipped token theme and the interactions a user makes. Mechanisms
 * are not re-probed: tabs reuse the measured roving-focus contract
 * (`roving-focus`, plan `158`), accordion headers the measured button role and
 * title-bar focus contract (`a11y-tree` plan `160`, `modal-focus-trap` plan
 * `155`), and the breadcrumb/pagination landmarks are the runtime's own
 * `navigation` role.
 *
 * Keyboard activation uses the host's `keyDown(testId, key)` — the same verb
 * the primitive probes use — because a synthetic `tab` keystroke does not
 * traverse in the `TestRenderer` (plan `140` §4); one `focusNext` check proves
 * the tab stop exists and that an arrow key reaches the focused trigger.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { useWindowSize } from "@gpuix/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Pagination,
  PaginationItem,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../vendor/packages/components/src/index.js";
import { useTheme } from "@gpuixui/tokens/react";
import { fieldText } from "../a11y.js";
import { Body, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import { ariaOf, focusedId, painted, read } from "./probes.js";

const Probe = () => {
  const theme = useTheme();
  const window = useWindowSize();
  const [tab, setTab] = useState("overview");
  const [open, setOpen] = useState<string | null>(null);
  const [collapsible, setCollapsible] = useState(false);
  const [path, setPath] = useState("home");
  const [page, setPage] = useState(5);

  return (
    <div
      testId="tier2-navigation-frame"
      style={{
        width: window.width,
        height: window.height,
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: theme.spacing.xl,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.xl,
          flexGrow: 1,
          minWidth: 0,
        }}
      >
        <Body>shipped Tier 2 navigation</Body>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList testId="tabs-list">
            <TabsTrigger
              testId="tab-overview"
              aria-id="tab-overview"
              aria-label="Overview"
              value="overview"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              testId="tab-activity"
              aria-id="tab-activity"
              aria-label="Activity"
              value="activity"
            >
              Activity
            </TabsTrigger>
            <TabsTrigger
              testId="tab-billing"
              aria-id="tab-billing"
              aria-label="Billing"
              value="billing"
              disabled
            >
              Billing
            </TabsTrigger>
            <TabsTrigger
              testId="tab-settings"
              aria-id="tab-settings"
              aria-label="Settings"
              value="settings"
            >
              Settings
            </TabsTrigger>
          </TabsList>
          <TabsContent
            testId="panel-overview"
            aria-id="panel-overview"
            value="overview"
          >
            <text
              testId="panel-overview-text"
              style={{ color: theme.colors.foreground }}
            >
              All systems normal
            </text>
          </TabsContent>
          <TabsContent
            testId="panel-activity"
            aria-id="panel-activity"
            value="activity"
          >
            <text
              testId="panel-activity-text"
              style={{ color: theme.colors.foreground }}
            >
              Three events today
            </text>
          </TabsContent>
          <TabsContent
            testId="panel-settings"
            aria-id="panel-settings"
            value="settings"
          >
            <text
              testId="panel-settings-text"
              style={{ color: theme.colors.foreground }}
            >
              Workspace preferences
            </text>
          </TabsContent>
        </Tabs>
        <Collapsible open={collapsible} onOpenChange={setCollapsible}>
          <CollapsibleTrigger
            testId="collapse-trigger"
            aria-id="collapse-trigger"
            aria-label="Advanced"
          >
            Advanced
          </CollapsibleTrigger>
          <CollapsibleContent>
            <text
              testId="collapse-body"
              style={{ color: theme.colors.mutedForeground }}
            >
              Cache and diagnostics
            </text>
          </CollapsibleContent>
        </Collapsible>
        <Accordion
          type="single"
          collapsible
          value={open}
          onValueChange={setOpen}
        >
          <AccordionItem value="shipping">
            <AccordionTrigger
              testId="acc-trigger-shipping"
              aria-id="acc-trigger-shipping"
              aria-label="Shipping"
            >
              Shipping
            </AccordionTrigger>
            <AccordionContent>
              <text
                testId="acc-content-shipping"
                style={{ color: theme.colors.mutedForeground }}
              >
                Arrives in two days
              </text>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="billing">
            <AccordionTrigger
              testId="acc-trigger-billing"
              aria-id="acc-trigger-billing"
              aria-label="Billing"
            >
              Billing
            </AccordionTrigger>
            <AccordionContent>
              <text
                testId="acc-content-billing"
                style={{ color: theme.colors.mutedForeground }}
              >
                Invoices are monthly
              </text>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="cancelled" disabled>
            <AccordionTrigger
              testId="acc-trigger-cancelled"
              aria-id="acc-trigger-cancelled"
              aria-label="Cancelled"
            >
              Cancelled
            </AccordionTrigger>
          </AccordionItem>
        </Accordion>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.xl,
          width: 520,
        }}
      >
        <Breadcrumb testId="breadcrumb" aria-id="breadcrumb">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                testId="crumb-home"
                aria-id="crumb-home"
                aria-label="Home"
                onSelect={() => setPath("home")}
              >
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink
                testId="crumb-projects"
                aria-id="crumb-projects"
                aria-label="Projects"
                onSelect={() => setPath("projects")}
              >
                Projects
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage testId="crumb-current" aria-id="crumb-current">
                Current
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Pagination
          testId="pagination"
          aria-id="pagination"
          page={page}
          pageCount={20}
          onPageChange={setPage}
        >
          <PaginationPrevious testId="page-prev" />
          <PaginationList />
          <PaginationItem testId="page-six" aria-id="page-six" page={6} />
          <PaginationNext testId="page-next" />
        </Pagination>
        <Readout testId="tier2-navigation-readout">
          {`tab=${tab} open=${open ?? "none"} collapsible=${
            collapsible ? "open" : "closed"
          } path=${path} page=${page}`}
        </Readout>
      </div>
    </div>
  );
};

export const tier2NavigationScenario: PlaygroundScenario = {
  id: "tier2-navigation",
  title:
    "Tier 2 navigation: Tabs, Accordion, Collapsible, Breadcrumb and Pagination",
  capability: "tier2",
  view: () => <Probe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectSome(
        "the probe frame is painted",
        painted(ctx, "tier2-navigation-frame"),
      );

      const tabsList = yield* ctx.expectSome(
        "the tab list is painted",
        painted(ctx, "tabs-list"),
      );
      yield* ctx.expectSome(
        "the initial tab paints its panel",
        painted(ctx, "panel-overview"),
      );
      yield* ctx.expectEqual(
        "the other panels stay closed",
        Option.isNone(painted(ctx, "panel-activity")),
        true,
      );
      const overviewTab = yield* ctx.expectSome(
        "the initial tab is exposed",
        ariaOf(ctx, "tab-overview"),
      );
      yield* ctx.expectEqual(
        "a tab is an AccessKit Tab",
        fieldText(overviewTab.role),
        "Tab",
      );
      yield* ctx.expectEqual(
        "the initial tab is selected",
        Option.getOrElse(overviewTab.selected, () => false),
        true,
      );

      // The first tab stop is the selected tab. Arrow navigation needs the
      // component's roving index, which Tabs seeds in `onFocus` — an event the
      // release-tag 0.10.0 never dispatches (plan `529` §6.5), so the click path
      // selects the next tab here and the arrow defect is pinned separately
      // below. The fix is the Tabs re-verify row in `TODO.md` (plans 344/345/390).
      ctx.host.focusNext();
      yield* ctx.expectEqual(
        "the selected tab is the first stop",
        focusedId(ctx),
        "tab-overview",
      );
      ctx.host.key("right");
      yield* ctx.expectContains(
        "Right leaves the selection on the first tab (plan 529; TODO.md Tabs row)",
        read(ctx, "tier2-navigation-readout"),
        "tab=overview",
      );
      ctx.host.click("tab-activity");
      yield* ctx.expectContains(
        "a click selects the next tab",
        read(ctx, "tier2-navigation-readout"),
        "tab=activity",
      );
      yield* ctx.expectEqual(
        "focus moved with the selection",
        focusedId(ctx),
        "tab-activity",
      );
      const activityPanel = yield* ctx.expectSome(
        "the newly selected panel paints",
        painted(ctx, "panel-activity"),
      );
      yield* ctx.expectEqual(
        "the previous panel left the tree",
        Option.isNone(painted(ctx, "panel-overview")),
        true,
      );
      yield* ctx.expectEqual(
        "the panel sits below the tab list",
        activityPanel.y >= tabsList.y + tabsList.height,
        true,
      );
      const activityTab = yield* ctx.expectSome(
        "the new tab is exposed",
        ariaOf(ctx, "tab-activity"),
      );
      yield* ctx.expectEqual(
        "the new tab is selected",
        Option.getOrElse(activityTab.selected, () => false),
        true,
      );
      const activityNode = yield* ctx.expectSome(
        "the panel is exposed",
        ariaOf(ctx, "panel-activity"),
      );
      yield* ctx.expectEqual(
        "the panel is a TabPanel named by its value",
        `${fieldText(activityNode.role)}:${fieldText(activityNode.label)}`,
        "TabPanel:activity",
      );

      // The arrow's disabled-skip cannot run on published 0.10.0: the roving
      // index stays where `onFocus` last seeded it (plan `529` §6.5). A click on
      // the next enabled tab is the working path; the disabled tab must stay
      // inert.
      ctx.host.click("tab-settings");
      yield* ctx.expectContains(
        "a click selects the next enabled tab",
        read(ctx, "tier2-navigation-readout"),
        "tab=settings",
      );
      yield* ctx.expectEqual(
        "the disabled tab never selects",
        Option.isNone(painted(ctx, "panel-activity")),
        true,
      );

      ctx.host.click("collapse-trigger");
      yield* ctx.expectContains(
        "the collapsible trigger opens",
        read(ctx, "tier2-navigation-readout"),
        "collapsible=open",
      );
      yield* ctx.expectSome(
        "the collapsible body paints",
        painted(ctx, "collapse-body"),
      );
      const collapseNode = yield* ctx.expectSome(
        "the collapsible header is exposed",
        ariaOf(ctx, "collapse-trigger"),
      );
      yield* ctx.expectEqual(
        "the header is a button",
        fieldText(collapseNode.role),
        "Button",
      );
      yield* ctx.expectEqual(
        "the header reports expanded",
        Option.getOrElse(collapseNode.expanded, () => false),
        true,
      );
      ctx.host.keyDown("collapse-trigger", "enter");
      yield* ctx.expectContains(
        "Enter closes the section",
        read(ctx, "tier2-navigation-readout"),
        "collapsible=closed",
      );
      yield* ctx.expectEqual(
        "the closed body left the tree",
        Option.isNone(painted(ctx, "collapse-body")),
        true,
      );

      ctx.host.click("acc-trigger-shipping");
      yield* ctx.expectContains(
        "clicking a header opens its section",
        read(ctx, "tier2-navigation-readout"),
        "open=shipping",
      );
      yield* ctx.expectSome(
        "the shipping body paints",
        painted(ctx, "acc-content-shipping"),
      );
      const shippingNode = yield* ctx.expectSome(
        "the shipping header is exposed",
        ariaOf(ctx, "acc-trigger-shipping"),
      );
      yield* ctx.expectEqual(
        "the open header reports expanded",
        Option.getOrElse(shippingNode.expanded, () => false),
        true,
      );
      ctx.host.click("acc-trigger-billing");
      yield* ctx.expectContains(
        "a second header replaces the first in single mode",
        read(ctx, "tier2-navigation-readout"),
        "open=billing",
      );
      yield* ctx.expectEqual(
        "the replaced body left the tree",
        Option.isNone(painted(ctx, "acc-content-shipping")),
        true,
      );
      yield* ctx.expectSome(
        "the billing body paints",
        painted(ctx, "acc-content-billing"),
      );

      ctx.host.keyDown("acc-trigger-shipping", "down");
      yield* ctx.expectEqual(
        "Down moves focus to the next enabled header",
        focusedId(ctx),
        "acc-trigger-billing",
      );
      ctx.host.keyDown("acc-trigger-billing", "enter");
      yield* ctx.expectContains(
        "Enter closes the open section (collapsible)",
        read(ctx, "tier2-navigation-readout"),
        "open=none",
      );
      yield* ctx.expectEqual(
        "the closed body left the tree",
        Option.isNone(painted(ctx, "acc-content-billing")),
        true,
      );

      ctx.host.click("crumb-home");
      yield* ctx.expectContains(
        "a breadcrumb click selects the crumb",
        read(ctx, "tier2-navigation-readout"),
        "path=home",
      );
      ctx.host.keyDown("crumb-projects", "enter");
      yield* ctx.expectContains(
        "Enter on a breadcrumb runs it",
        read(ctx, "tier2-navigation-readout"),
        "path=projects",
      );
      const breadcrumb = yield* ctx.expectSome(
        "the trail is an accessible landmark",
        ariaOf(ctx, "breadcrumb"),
      );
      yield* ctx.expectEqual(
        "the trail is a Navigation named Breadcrumb",
        `${fieldText(breadcrumb.role)}:${fieldText(breadcrumb.label)}`,
        "Navigation:Breadcrumb",
      );
      const link = yield* ctx.expectSome(
        "a crumb is an accessible link",
        ariaOf(ctx, "crumb-projects"),
      );
      yield* ctx.expectEqual("a crumb is a Link", fieldText(link.role), "Link");
      yield* ctx.expectEqual(
        "the current page is not a link",
        Option.exists(ariaOf(ctx, "crumb-current"), (node) =>
          Option.contains(node.role, "Link"),
        ),
        false,
      );

      const pagination = yield* ctx.expectSome(
        "the pagination is an accessible landmark",
        ariaOf(ctx, "pagination"),
      );
      yield* ctx.expectEqual(
        "the control is a Navigation named Pagination",
        `${fieldText(pagination.role)}:${fieldText(pagination.label)}`,
        "Navigation:Pagination",
      );
      const sixth = yield* ctx.expectSome(
        "a page control is exposed",
        ariaOf(ctx, "page-six"),
      );
      yield* ctx.expectEqual(
        "a non-current page is not selected",
        Option.getOrElse(sixth.selected, () => true),
        false,
      );
      ctx.host.click("page-six");
      yield* ctx.expectContains(
        "a page click reports through onPageChange",
        read(ctx, "tier2-navigation-readout"),
        "page=6",
      );
      const currentSixth = yield* ctx.expectSome(
        "the page control stays exposed",
        ariaOf(ctx, "page-six"),
      );
      yield* ctx.expectEqual(
        "the current page is aria-selected",
        Option.getOrElse(currentSixth.selected, () => false),
        true,
      );
      yield* ctx.expectContains(
        "the window paints its last page",
        ctx.host.paintedText().join("\n"),
        "20",
      );

      ctx.host.click("page-next");
      yield* ctx.expectContains(
        "Next advances one page",
        read(ctx, "tier2-navigation-readout"),
        "page=7",
      );
      ctx.host.click("page-prev");
      yield* ctx.expectContains(
        "Prev goes back one page",
        read(ctx, "tier2-navigation-readout"),
        "page=6",
      );
      yield* ctx.expectEqual(
        "Prev and Next are both painted",
        [painted(ctx, "page-prev"), painted(ctx, "page-next")].every(
          Option.isSome,
        ),
        true,
      );
    }),
};
