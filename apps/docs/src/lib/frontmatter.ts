export const frontmatterOf = (source: string): string =>
  /^---\n([\s\S]*?)\n---\n/.exec(source)?.[1] ?? "";

export const frontmatterField = (
  head: string,
  key: string,
): string | undefined => {
  const value = new RegExp(`^${key}:\\s*(.+)$`, "m").exec(head)?.[1]?.trim();
  if (value === undefined) return undefined;
  return value.startsWith('"') || value.startsWith("'")
    ? value.slice(1, -1)
    : value;
};
