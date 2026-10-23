/**
 * Browser preview for the EmptyState page.
 *
 * The shipped panel is centred and unfocusable — a panel, not a surface, so it
 * paints no background or border of its own and sits inside the `Card`, panel
 * or table body that already supplies one. The preview draws three shapes a
 * caller reaches: the full state with an action, an icon with no action, and
 * the title-only state, each on the card that would hold it.
 */

export function EmptyStateDemo() {
  return (
    <div className="gx-empty-grid">
      <div className="gx-empty-card">
        <p className="gx-empty-state-label">action</p>
        <div className="gx-empty-state">
          <p className="gx-empty-title">No projects yet</p>
          <p className="gx-empty-desc">
            A project holds your files, runs and settings.
          </p>
          <div className="gx-empty-action">
            <button className="gx-btn gx-btn-primary gx-btn-sm" type="button">
              New project
            </button>
          </div>
        </div>
      </div>

      <div className="gx-empty-card">
        <p className="gx-empty-state-label">icon</p>
        <div className="gx-empty-state">
          <span aria-hidden="true" className="gx-empty-icon">
            ◌
          </span>
          <p className="gx-empty-title">Nothing here</p>
          <p className="gx-empty-desc">
            The inbox is empty — new mentions land here.
          </p>
        </div>
      </div>

      <div className="gx-empty-card">
        <p className="gx-empty-state-label">title only</p>
        <div className="gx-empty-state">
          <p className="gx-empty-title">Loading…</p>
        </div>
      </div>

      <p className="gx-empty-note">
        A panel, not a surface: the card behind it is the caller&rsquo;s. The
        description wraps at a fixed 360px, and any icon paints muted.
      </p>
    </div>
  );
}

export const emptyStateDemoSource = `import { EmptyState } from "@gpuixui/components/empty-state";
import { Button } from "@gpuixui/primitives";

<EmptyState
  title="No projects yet"
  description="A project holds your files, runs and settings."
  action={<Button variant="primary">New project</Button>}
/>;

<EmptyState
  icon={<Icon name="inbox" />}
  title="Nothing here"
  description="The inbox is empty — new mentions land here."
/>;

<EmptyState title="Loading…" />;`;
