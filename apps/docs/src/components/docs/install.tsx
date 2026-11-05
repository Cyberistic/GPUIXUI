import { HighlightedCode } from "@/components/highlighted-code";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "fumadocs-ui/components/tabs";

/**
 * The install block shared by every component page: the shadcn registry
 * command, the item's direct address, and the package import the page uses.
 *
 * The registry names items `<package>-<page>`, so the command is derived from
 * the page's package and component. `ToastProvider` is the one page whose
 * import differs from its slug; the registry still calls that item `toast`.
 */
const itemAliases: Readonly<Record<string, string>> = {
  ToastProvider: "toast",
};

const kebab = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

export function Install({
  packageName,
  importName,
}: {
  packageName: string;
  importName: string;
}) {
  const pkg = packageName.split("/").at(-1) ?? packageName;
  const item = `${pkg}-${itemAliases[importName] ?? kebab(importName)}`;
  const command = `npx shadcn@latest add @sudokw/${item}`;
  const direct = `npx shadcn@latest add https://gpuixui.sudokw.com/${item}.json`;
  const usage = `import { ${importName} } from "${packageName}";`;

  return (
    <div className="gx-source not-prose">
      <Tabs defaultValue="shadcn">
        <TabsList>
          <TabsTrigger value="shadcn">shadcn</TabsTrigger>
          <TabsTrigger value="url">URL</TabsTrigger>
        </TabsList>
        <TabsContent value="shadcn">
          <HighlightedCode lang="bash" code={command} />
          <p className="gx-install-note">
            Copies the component and the runtime it imports into your project.
          </p>
        </TabsContent>
        <TabsContent value="url">
          <HighlightedCode lang="bash" code={direct} />
          <p className="gx-install-note">
            The same item by its direct address, for a client that does not read
            the directory.
          </p>
        </TabsContent>
      </Tabs>
      <HighlightedCode lang="tsx" code={usage} />
    </div>
  );
}
