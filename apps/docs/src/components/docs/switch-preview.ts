export interface SyncSettings {
  readonly enabled: boolean;

  readonly metered: boolean;

  readonly reducedMotion: boolean;
}

export const initialSync: SyncSettings = {
  enabled: true,
  metered: false,
  reducedMotion: false,
};

export const setEnabled = (
  settings: SyncSettings,
  enabled: boolean,
): SyncSettings =>
  enabled
    ? { ...settings, enabled: true }
    : { ...settings, enabled: false, metered: false };

export const setMetered = (
  settings: SyncSettings,
  metered: boolean,
): SyncSettings =>
  settings.enabled ? { ...settings, metered } : { ...settings, metered: false };

export const setReducedMotion = (
  settings: SyncSettings,
  reducedMotion: boolean,
): SyncSettings => ({ ...settings, reducedMotion });

export const meteredAvailable = (settings: SyncSettings): boolean =>
  settings.enabled;

export const describeSync = (settings: SyncSettings): string => {
  if (!settings.enabled) return "Sync is off. Nothing leaves this machine.";
  return settings.metered
    ? "Syncing on any network, metered ones included."
    : "Syncing on unmetered networks only.";
};

export const THUMB_SLIDE_MS = 160;

export const THUMB_SLIDE_CSS_EASE = "ease-in-out";

export const slideMs = (reducedMotion: boolean): number =>
  reducedMotion ? 0 : THUMB_SLIDE_MS;
