export interface FontRegistrar {
  registerFont(data: Uint8Array): void;
}

export interface FontSource {
  readonly family: string;

  readonly data: Uint8Array;
}

const installed = new WeakMap<FontRegistrar, WeakSet<Uint8Array>>();

const installedWith = (registrar: FontRegistrar): WeakSet<Uint8Array> => {
  const seen = installed.get(registrar);
  if (seen !== undefined) {
    return seen;
  }
  const created = new WeakSet<Uint8Array>();
  installed.set(registrar, created);
  return created;
};

export function registerFonts(
  registrar: FontRegistrar,
  fonts: ReadonlyArray<FontSource>,
): ReadonlyArray<string> {
  const seen = installedWith(registrar);
  const families: string[] = [];
  fonts.forEach((font) => {
    if (!seen.has(font.data)) {
      registrar.registerFont(font.data);
      seen.add(font.data);
    }
    if (!families.includes(font.family)) {
      families.push(font.family);
    }
  });
  return families;
}
