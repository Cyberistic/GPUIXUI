import { lookLabel, lookOrder, type LookName } from "../../lib/platform";
import { usePlatform } from "./platform-toggle";

/**
 * The authored looks, as a control on the Theming page.
 *
 * The sidebar switch is the mission's platform toggle — the four platform
 * names, no look group, because a look is not a fifth platform. This picker is
 * the page's own control: it writes the look into the URL (`?look=luna`) and
 * the provider applies `retroStyles` over whichever platform is showing, so the
 * specimens beside it repaint in a real library style rather than a docs skin.
 * A link carries the choice, and the store remembers it; pressing a platform in
 * the sidebar clears it, because a look fixes the palette, radii and density
 * and the press would otherwise move only its label.
 */
export function LookPicker() {
  const { look, setLook, theme } = usePlatform();

  return (
    <LookPickerBody look={look} onSelect={setLook} themeName={theme.name} />
  );
}

/** The picker's markup for one choice, so the buttons are testable without a provider. */
export function LookPickerBody({
  look,
  onSelect,
  themeName,
}: {
  /** The look the URL carried, resolved against the platform's theme. */
  readonly look: LookName;
  readonly onSelect: (look: LookName) => void;
  /** The theme name the provider resolved, e.g. `Dark · macOS · Windows XP (Luna)`. */
  readonly themeName: string;
}) {
  return (
    <div className="gx-look not-prose">
      <p className="gx-platform-title">Authored look</p>
      <div
        aria-label="Authored look"
        className="gx-platform-group"
        role="group"
      >
        {lookOrder.map((name) => (
          <button
            aria-pressed={look === name}
            className="gx-platform-option"
            data-look={name}
            key={name}
            onClick={() => onSelect(name)}
            type="button"
          >
            {lookLabel(name)}
          </button>
        ))}
      </div>
      <p className="gx-platform-meta">{themeName}</p>
    </div>
  );
}
