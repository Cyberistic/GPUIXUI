# Wallpapers

Photographs, downscaled to 2560×1600 and (for macOS) pre-blurred by ffmpeg — the
runtime has no blur and the offscreen renderer has no window server, so a vibrant
desktop is a blurred wallpaper, not a filter. The five theme wallpapers are the
ones Omarchy ships with those themes, so the film's desktop is the desktop a
reader gets after `omarchy-theme-set`.

| File | Source | Author / licence |
| --- | --- | --- |
| `omarchy.jpg` | [Sunrise at Maligne lake](https://commons.wikimedia.org/wiki/File:Sunrise_at_Maligne_lake.jpg) | CC BY-SA 4.0 |
| `windows.jpg` | [Sea wave abstract texture (Unsplash)](https://commons.wikimedia.org/wiki/File:Sea_wave_abstract_texture_(Unsplash).jpg) | CC0 |
| `macos.jpg` | `omarchy.jpg`, blurred (`boxblur=24`) | CC BY-SA 4.0, as above |
| `omarchy-tokyo-night.jpg` | `themes/tokyo-night/backgrounds/4-sunset-lake.webp` | basecamp/omarchy (MIT); photograph credited upstream |
| `omarchy-rose-pine.jpg` | `themes/rose-pine/backgrounds/3-omarchy-plants.webp` | as above |
| `omarchy-gruvbox.jpg` | `themes/gruvbox/backgrounds/2-flower-basket.webp` | as above |
| `omarchy-catppuccin-latte.jpg` | `themes/catppuccin-latte/backgrounds/1-color-fade.webp` | as above |
| `omarchy-everforest.jpg` | `themes/everforest/backgrounds/1-tree-tops.webp` | as above |

The macOS desktop currently uses its drawn ground instead: the Agent window's
platform materials paint translucent over a photograph (the platform's material
fills win over the theme's opaque window mode), which reads as a ghost window.
