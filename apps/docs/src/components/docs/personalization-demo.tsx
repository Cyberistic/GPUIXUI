import { retroTheme, themes } from "@gpuixui/tokens";
import { toCssVars } from "../../lib/theme-css";

const aero = retroTheme(themes.dark, "aero");

/** The eight themes the control panel offers, in the reference's order. */
const THEMES = [
  "Windows 7",
  "Architecture",
  "Characters",
  "Landscapes",
  "Nature",
  "Scenes",
  "Brand",
  "Studio",
] as const;

/** The four settings the reference lists under the grid. */
const SETTINGS = [
  ["Desktop Background", "Harmony"],
  ["Window Color", "Sky"],
  ["Sounds", "Windows Default"],
  ["Screen Saver", "None"],
] as const;

/** The page's own links, in the order the reference paints them. */
const LINKS = [
  "Control Panel Home",
  "Change desktop icons",
  "Change mouse pointers",
  "Change your account picture",
] as const;

const ALSO = ["Display", "Taskbar and Start Menu", "Ease of Access Center"];

/**
 * Windows 7's Personalization screen, drawn from the Aero look's own roles.
 *
 * The reference art is Microsoft's; this is the *screen* rebuilt in the
 * library's vocabulary: the chrome, the address bar, the theme grid and the
 * four settings read the Aero theme's colours, radii and density, and the
 * thumbnails are two-stop gradients rather than the shipped wallpapers. No
 * bitmap, gradient ramp or mark of the original is copied.
 */
export function PersonalizationWindow() {
  return (
    <div className="gx-pz not-prose" data-look="aero" style={toCssVars(aero)}>
      <div className="gx-pz-window">
        <div className="gx-pz-titlebar">
          <span className="gx-pz-title">Control Panel</span>
          <span className="gx-pz-caption">
            <span className="gx-pz-caption-button" data-mark="minimize" />
            <span className="gx-pz-caption-button" data-mark="maximize" />
            <span className="gx-pz-caption-button" data-mark="close" />
          </span>
        </div>

        <div className="gx-pz-address">
          <span className="gx-pz-nav" aria-hidden="true">
            ‹ ›
          </span>
          <span className="gx-pz-trail">
            Control Panel
            <span className="gx-pz-caret">›</span>
            All Control Panel Items
            <span className="gx-pz-caret">›</span>
            Personalization
          </span>
          <span className="gx-pz-search">Search Control Panel</span>
        </div>

        <div className="gx-pz-body">
          <nav aria-label="Control panel links" className="gx-pz-links">
            {LINKS.map((label, index) => (
              <span
                className="gx-pz-link"
                data-first={index === 0 ? "" : undefined}
                key={label}
              >
                {label}
              </span>
            ))}
            <span className="gx-pz-see">See also</span>
            {ALSO.map((label) => (
              <span className="gx-pz-link" key={label}>
                {label}
              </span>
            ))}
          </nav>

          <div className="gx-pz-main">
            <h3 className="gx-pz-heading">
              Change the visuals and sounds on your computer
            </h3>
            <p className="gx-pz-lead">
              Click a theme to change the desktop background, window color,
              sounds, and screen saver all at once.
            </p>

            <div className="gx-pz-grid">
              {THEMES.map((label, index) => (
                <span
                  className="gx-pz-theme"
                  data-current={index === 0 ? "" : undefined}
                  key={label}
                >
                  <span className="gx-pz-stack" data-theme={index}>
                    <span className="gx-pz-thumb" />
                  </span>
                  <span className="gx-pz-theme-label">{label}</span>
                </span>
              ))}
            </div>

            <div className="gx-pz-settings">
              {SETTINGS.map(([label, value], index) => (
                <span className="gx-pz-setting" key={label}>
                  <span className="gx-pz-setting-mark" data-setting={index} />
                  <span className="gx-pz-setting-label">{label}</span>
                  <span className="gx-pz-setting-value">{value}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
