import { frontmatterField, frontmatterOf } from "./frontmatter";

export interface BlockPage {
  readonly slug: string;
  readonly title: string;
  readonly description: string;

  readonly url: string;
}

const listPages: ReadonlyArray<string> = ["index", "all"];

const slugOf = (file: string): string =>
  (file.split("/").at(-1) ?? file).replace(/\.mdx$/, "");

export const blockPages = (
  files: Readonly<Record<string, string>>,
  baseUrl: string,
): ReadonlyArray<BlockPage> =>
  Object.entries(files)
    .flatMap(([file, source]): BlockPage[] => {
      const slug = slugOf(file);
      if (listPages.includes(slug)) return [];
      const head = frontmatterOf(source);
      return [
        {
          slug,
          title: frontmatterField(head, "title") ?? slug,
          description: frontmatterField(head, "description") ?? "",
          url: `${baseUrl}/${slug}`,
        },
      ];
    })
    .toSorted((left, right) => left.title.localeCompare(right.title));
