/** @jsxImportSource @gpuix/react */
/**
 * The live scenes, as real library components on the GPUix renderer.
 *
 * A scene is a full surface: it owns the theme it was given, names no colour
 * literal, and never reaches for a browser global. `main.tsx` supplies the
 * theme and the window size; the scene supplies the composition.
 *
 * Tier 2 components are imported by subpath on purpose: the package root also
 * re-exports Toast, whose provider builds an Effect runtime that a 20 MB browser
 * bundle has no use for (plan 456 §2).
 */
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@gpuixui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@gpuixui/components/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@gpuixui/components/tabs";
import { Box, Button, Stack, Text } from "@gpuixui/primitives";
import type { ReactElement } from "react";
import type { LiveScene } from "./scenes";

const ButtonScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Stack direction="column" gap="2xs">
      <Text role="h3">Buttons</Text>
      <Text role="caption" tone="muted">
        The real `@gpuixui/primitives` component on the GPUix renderer.
      </Text>
    </Stack>
    <Stack direction="row" gap="sm" wrap>
      <Button variant="primary">Save changes</Button>
      <Button variant="secondary">Cancel</Button>
      <Button variant="outline">Duplicate</Button>
      <Button variant="ghost">Skip</Button>
      <Button variant="destructive">Delete</Button>
    </Stack>
    <Stack direction="row" gap="sm" wrap>
      <Button variant="primary" size="sm">
        Small
      </Button>
      <Button variant="primary" size="md">
        Medium
      </Button>
      <Button variant="primary" size="lg">
        Large
      </Button>
      <Button variant="primary" disabled>
        Disabled
      </Button>
    </Stack>
  </Stack>
);

const TabsScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">Account settings</Text>
    <Tabs defaultValue="profile">
      <TabsList label="Account">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <Text role="label">Profile</Text>
        <Text role="body" tone="muted">
          Your name and avatar appear beside every comment you write.
        </Text>
      </TabsContent>
      <TabsContent value="notifications">
        <Text role="label">Notifications</Text>
        <Text role="body" tone="muted">
          A weekly digest is sent every Monday at 08:00.
        </Text>
      </TabsContent>
      <TabsContent value="billing">
        <Text role="label">Billing</Text>
        <Text role="body" tone="muted">
          The next invoice is issued on the first of the month.
        </Text>
      </TabsContent>
    </Tabs>
  </Stack>
);

const DropdownMenuScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">File actions</Text>
    <Text role="caption" tone="muted">
      The menu opens with the scene, so the real surface is visible without a
      pointer.
    </Text>
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      <DropdownMenuContent label="File actions">
        <DropdownMenuLabel>This file</DropdownMenuLabel>
        <DropdownMenuItem>Rename</DropdownMenuItem>
        <DropdownMenuItem disabled>Duplicate</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="destructive">Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </Stack>
);

const DialogScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">Workspace settings</Text>
    <Text role="caption" tone="muted">
      The dialog opens with the scene, so focus entry and the blocking veil are
      visible without a pointer.
    </Text>
    <Dialog defaultOpen>
      <DialogTrigger>Delete workspace</DialogTrigger>
      <DialogContent label="Delete workspace">
        <DialogHeader>
          <DialogTitle>Delete this workspace?</DialogTitle>
          <DialogDescription>
            The workspace and its 42 files are removed for everyone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
          <Button variant="destructive">Delete workspace</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </Stack>
);

export const LIVE_SCENE_VIEWS: Readonly<Record<LiveScene, () => ReactElement>> =
  {
    button: ButtonScene,
    tabs: TabsScene,
    "dropdown-menu": DropdownMenuScene,
    dialog: DialogScene,
  };

/** The surface chrome every scene sits in: the theme's own background. */
export const LiveSurface = ({
  size,
  children,
}: {
  readonly size: { readonly width: number; readonly height: number };
  readonly children: ReactElement;
}): ReactElement => (
  <Box
    tone="background"
    padding="lg"
    style={{ width: size.width, height: size.height }}
  >
    {children}
  </Box>
);
