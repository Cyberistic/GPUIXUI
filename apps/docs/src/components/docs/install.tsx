import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "fumadocs-ui/components/tabs";

/**
 * The install block shared by every component page: the `nub` command for a
 * workspace consumer, and the manual manifest entry for a consumer that pins
 * the dependency by hand.
 *
 * GPUixUI's packages are private workspace packages, so there is no registry
 * command yet. The note says so instead of inventing one.
 */
export function Install({
  packageName,
  importName,
}: {
  packageName: string;
  importName: string;
}) {
  const command = `nub add ${packageName}@workspace:*`;
  const manifest = `{
  "dependencies": {
    "${packageName}": "workspace:*"
  }
}`;
  const usage = `import { ${importName} } from "${packageName}";`;

  return (
    <div className="gx-source not-prose">
      <Tabs defaultValue="nub">
        <TabsList>
          <TabsTrigger value="nub">nub</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
        </TabsList>
        <TabsContent value="nub">
          <DynamicCodeBlock lang="bash" code={command} />
          <p className="gx-install-note">
            Run this inside the GPUIXUI workspace. The packages are private and
            not published to a registry, so the workspace protocol is the
            version. A fresh checkout installs everything with{" "}
            <code>nub install</code>.
          </p>
        </TabsContent>
        <TabsContent value="manual">
          <DynamicCodeBlock lang="json" code={manifest} />
          <p className="gx-install-note">
            Add the dependency to the consuming package, run{" "}
            <code>nub install</code>, then import from the package root:
          </p>
          <DynamicCodeBlock lang="tsx" code={usage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
