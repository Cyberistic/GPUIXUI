import { lookLabel, lookOrder, type LookName } from "../../lib/platform";
import { usePlatform } from "./platform-toggle";

export function LookPicker() {
  const { look, setLook, theme } = usePlatform();

  return (
    <LookPickerBody look={look} onSelect={setLook} themeName={theme.name} />
  );
}

export function LookPickerBody({
  look,
  onSelect,
  themeName,
}: {
  readonly look: LookName;
  readonly onSelect: (look: LookName) => void;

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
