import { HighlightedCode } from "@/components/highlighted-code";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "fumadocs-ui/components/tabs";

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
        </TabsContent>
        <TabsContent value="url">
          <HighlightedCode lang="bash" code={direct} />
        </TabsContent>
      </Tabs>
      <HighlightedCode lang="tsx" code={usage} />
    </div>
  );
}
