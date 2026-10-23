/**
 * Browser preview for the Page transition page.
 *
 * The native region swaps views with the house exit and entrance; the preview
 * clips one frame and slides the incoming view in from the travel direction.
 */

import { useState } from "react";

const views = {
  account: {
    title: "Account",
    body: "Name, avatar and timezone. Changes apply to every project.",
  },
  billing: {
    title: "Billing",
    body: "Plan, seats and invoices. Billing is per workspace.",
  },
} as const;

type View = keyof typeof views;

export function PageTransitionDemo() {
  const [view, setView] = useState<View>("account");
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const go = (next: View, dir: "forward" | "back") => {
    setDirection(dir);
    setView(next);
  };

  return (
    <div className="gx-pagetransition">
      <div className="gx-pagetransition-frame">
        <div
          className="gx-pagetransition-view"
          data-direction={direction}
          key={view}
        >
          <p className="gx-pagetransition-title">{views[view].title}</p>
          <p className="gx-pagetransition-copy">{views[view].body}</p>
        </div>
      </div>
      <div className="gx-pagetransition-actions">
        <button
          className="gx-btn gx-btn-secondary gx-btn-sm"
          disabled={view === "account"}
          onClick={() => go("account", "back")}
          type="button"
        >
          Back
        </button>
        <button
          className="gx-btn gx-btn-secondary gx-btn-sm"
          disabled={view === "billing"}
          onClick={() => go("billing", "forward")}
          type="button"
        >
          Forward
        </button>
      </div>
    </div>
  );
}

export const pageTransitionDemoSource = `import { PageTransition } from "@gpuixui/components/page-transition";

<PageTransition viewKey={section} direction={direction}>
  {section === "account" ? <AccountView /> : <BillingView />}
</PageTransition>;`;
