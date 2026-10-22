/**
 * The switch preview's settings model.
 *
 * A switch is a two-position control, so the interesting decisions are not the
 * pixels but what "immediate" means for the settings under it: a dependent
 * setting cannot stay on while the setting it depends on is off, and turning
 * the master off must clear it rather than leave it silently on. That rule is
 * app composition — the component has no idea a second switch exists — so it
 * lives here where a test can fail it.
 *
 * The slide is the component's: 150 ms `easeOut` on the thumb's `left` inset,
 * which the caller may turn into a zero-duration landing with `reducedMotion`.
 * The duration is read from `Switch.tsx` by the test, so the preview's CSS
 * cannot claim a slide the component does not paint.
 */

/** What the settings panel holds. */
export interface SyncSettings {
  /** The master switch: the workspace syncs at all. */
  readonly enabled: boolean;
  /** A dependent setting: sync on a connection the reader pays for. */
  readonly metered: boolean;
  /** A preference that is not a sync setting: the preview's own slide. */
  readonly reducedMotion: boolean;
}

/** The panel's opening state: syncing, unmetered, sliding. */
export const initialSync: SyncSettings = {
  enabled: true,
  metered: false,
  reducedMotion: false,
};

/**
 * The settings after the master switch is pressed.
 *
 * Turning sync off clears the dependent — a setting that cannot act must not
 * read as on — and turning it back on does not restore it: the reader turned
 * metered syncing off implicitly, and guessing it back on would spend their
 * data. An unrelated preference survives either direction.
 */
export const setEnabled = (
  settings: SyncSettings,
  enabled: boolean,
): SyncSettings =>
  enabled
    ? { ...settings, enabled: true }
    : { ...settings, enabled: false, metered: false };

/**
 * The settings after the dependent switch is pressed.
 *
 * A press the disabled control cannot deliver is refused rather than trusted:
 * the panel is disabled while the master is off, so this is unreachable from
 * the UI and stays true if a caller reorders the two.
 */
export const setMetered = (
  settings: SyncSettings,
  metered: boolean,
): SyncSettings =>
  settings.enabled ? { ...settings, metered } : { ...settings, metered: false };

/** The settings after the motion preference is pressed. */
export const setReducedMotion = (
  settings: SyncSettings,
  reducedMotion: boolean,
): SyncSettings => ({ ...settings, reducedMotion });

/** Whether the dependent switch can take a press: only under a live master. */
export const meteredAvailable = (settings: SyncSettings): boolean =>
  settings.enabled;

/** The line the panel prints under the switches. */
export const describeSync = (settings: SyncSettings): string => {
  if (!settings.enabled) return "Sync is off. Nothing leaves this machine.";
  return settings.metered
    ? "Syncing on any network, metered ones included."
    : "Syncing on unmetered networks only.";
};

/**
 * The thumb's slide, in milliseconds — `Switch.tsx`'s `THUMB_SLIDE` duration.
 *
 * `reducedMotion` paints the same two positions with no duration, because the
 * runtime exposes no preference and the caller supplies its own.
 */
export const THUMB_SLIDE_MS = 150;

/** The slide the preview paints for a motion preference. */
export const slideMs = (reducedMotion: boolean): number =>
  reducedMotion ? 0 : THUMB_SLIDE_MS;
