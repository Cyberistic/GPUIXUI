# Wallpapers

Two photographs, from Wikimedia Commons, downscaled to 2560×1600 and (for macOS)
pre-blurred by ffmpeg — the runtime has no blur and the offscreen renderer has no
window server, so a vibrant desktop is a blurred wallpaper, not a filter.

| File | Source | Author / licence |
| --- | --- | --- |
| `omarchy.jpg` | [Sunrise at Maligne lake](https://commons.wikimedia.org/wiki/File:Sunrise_at_Maligne_lake.jpg) | CC BY-SA 4.0 |
| `windows.jpg` | [Sea wave abstract texture (Unsplash)](https://commons.wikimedia.org/wiki/File:Sea_wave_abstract_texture_(Unsplash).jpg) | CC0 |
| `macos.jpg` | `omarchy.jpg`, blurred (`boxblur=24`) | CC BY-SA 4.0, as above |

The macOS desktop currently uses its drawn ground instead: the Agent window's
platform materials paint translucent over a photograph (the platform's material
fills win over the theme's opaque window mode), which reads as a ghost window.
