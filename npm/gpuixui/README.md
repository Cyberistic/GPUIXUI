# @sudokw/gpuixui

Native React components for GPUix — the **GPUIxUI** library: dialogs, menus,
pickers, tables, editors, a file tree, a media player, workspace chrome, and 83
icons, all themed by semantic roles.

**This version reserves the name. The library is not published yet.**

- Documentation, every component and every preview: <https://gpuixui.sudokw.com>
- Source: <https://github.com/Cyberistic/GPUIXUI>
- Build prompt for an agent: <https://gpuixui.sudokw.com/getting-started/prompt>

GPUIxUI is a from-scratch library built on top of the GPUix runtime. It is not
published by the GPUix maintainers and is not part of the `@gpuix` scope on npm —
the scope here is the project's own. The components render through GPUix's
reconciler rather than the DOM, so they are not interchangeable with a browser
component library.

## Status

The packages are private and workspace-linked today (`@gpuixui/components`,
`@gpuixui/primitives`, `@gpuixui/icons`, …). Publishing them is a packaging job of
its own — entry points, the `@gpuix/react` peer and the per-platform
`@gpuix/native` binaries all have to line up — so this name is claimed first and
the release follows.
