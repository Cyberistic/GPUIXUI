/**
 * Browser preview for the IconButton page.
 *
 * The icon button is a square `Button` whose only content is a glyph, so the
 * preview reuses the shared button chrome and draws a glyph from the theme's
 * roles. The states are the resting, busy and disabled paint. The Code tab
 * shows the native usage.
 */

const glyphs = [
  { label: "Delete layer", name: "trash", variant: "destructive", mark: "×" },
  {
    label: "Layer settings",
    name: "settings",
    variant: "secondary",
    mark: "⚙",
  },
  { label: "Add layer", name: "plus", variant: "outline", mark: "+" },
] as const;

export const IconButtonDemo = () => (
  <div className="gx-demo gx-demo-column gx-iconbtn-scene">
    <p className="gx-demo-label">Variants</p>
    <div className="gx-demo-row">
      {glyphs.map((entry) => (
        <button
          aria-label={entry.label}
          className={`gx-btn gx-btn-${entry.variant} gx-btn-square gx-iconbtn`}
          key={entry.label}
          type="button"
        >
          <span aria-hidden="true" className="gx-iconbtn-glyph">
            {entry.mark}
          </span>
        </button>
      ))}
    </div>
    <p className="gx-demo-label">States</p>
    <div className="gx-demo-row">
      <button
        aria-label="Saving"
        className="gx-btn gx-btn-primary gx-btn-square gx-iconbtn"
        type="button"
      >
        <span aria-hidden="true" className="gx-spinner" />
      </button>
      <button
        aria-label="Unavailable"
        className="gx-btn gx-btn-secondary gx-btn-square gx-iconbtn"
        disabled
        type="button"
      >
        <span aria-hidden="true" className="gx-iconbtn-glyph">
          ✓
        </span>
      </button>
    </div>
  </div>
);

const iconButtonDemoSource = `import { IconButton, Stack, useTheme } from "@gpuixui/primitives";
import { Icon } from "@gpuixui/icons";

const theme = useTheme();

<Stack direction="row" gap="2xs">
  <IconButton
    label="Delete layer"
    icon={<Icon name="trash" color={theme.colors.destructiveForeground} />}
    variant="destructive"
    onActivate={removeLayer}
  />
  <IconButton
    label="Layer settings"
    icon={<Icon name="settings" color={theme.colors.foreground} />}
    onActivate={openSettings}
  />
</Stack>;

// The label is required and never derived from the glyph.
<IconButton label="Saving" loading />;
<IconButton label="Unavailable" disabled icon={<Icon name="check" />} />;`;

export { iconButtonDemoSource };
