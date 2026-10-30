"""Cut the blocks film: the continuous native take, sectioned by platform.

Each section is one ffmpeg pass over a frame range of the take, with a slow push,
the window's rounded mask and a caption. Then the logo and end cards.
"""

import pathlib
import subprocess

ROOT = pathlib.Path("/tmp/film")
TAKE = ROOT / "take-blocks"
FONT = "/System/Library/Fonts/SFNS.ttf"
FPS = 60
WINDOW_W = 1200
WINDOW_H = 775


def run(args: list[str]) -> None:
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        raise SystemExit(result.stderr[-2500:])


def mask(width: int, height: int, radius: int = 14) -> pathlib.Path:
    path = ROOT / f"mask-{width}x{height}.png"
    if path.exists():
        return path
    expression = (
        f"if(lt(hypot(max(0\\,abs(X-{width / 2})-({width / 2}-{radius}))\\,"
        f"max(0\\,abs(Y-{height / 2})-({height / 2}-{radius})))\\,{radius})\\,255\\,0)"
    )
    run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "lavfi", "-i", f"color=black:s={width}x{height}",
        "-vf", f"format=gray,geq=lum='{expression}'",
        "-frames:v", "1", str(path),
    ])
    return path


def caption(text: str | None) -> str:
    if text is None:
        return "null"
    escaped = text.replace(":", "\\:").replace("'", "’")
    return (
        f"drawtext=fontfile={FONT}:text='{escaped}':fontcolor=0xf5f5f7:fontsize=30:"
        f"x=(w-text_w)/2:y=56"
    )


def section(name: str, start: int, frames: int, text: str | None) -> pathlib.Path:
    """One section of the take, pushed in over its own length."""
    out = ROOT / f"b-{name}.mp4"
    seconds = frames / FPS
    # A slow push: 4% over the section, kept inside the frame's centre.
    zoom = (
        f"zoompan=z='1+0.04*on/{frames}':x='iw/2-(iw/zoom/2)':"
        f"y='ih/2-(ih/zoom/2)':d=1:s={WINDOW_W}x{WINDOW_H}:fps={FPS}"
    )
    x = (1920 - WINDOW_W) // 2
    y = (1080 - WINDOW_H) // 2
    filters = ";".join([
        "[0:v]format=rgba[bg]",
        f"[1:v]{zoom},setsar=1,format=rgba[win]",
        "[win][2:v]alphamerge[rounded]",
        f"[bg][rounded]overlay={x}:{y}:format=auto[ov]",
        f"[ov]{caption(text)}[out]" if text else "[ov]null[out]",
    ])
    run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-loop", "1", "-framerate", str(FPS), "-i", str(ROOT / "wallpaper.png"),
        "-framerate", str(FPS), "-start_number", str(start), "-i", str(TAKE / "%05d.png"),
        "-loop", "1", "-i", str(mask(WINDOW_W, WINDOW_H)),
        "-filter_complex", filters, "-map", "[out]",
        "-frames:v", str(frames), "-r", str(FPS),
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        str(out),
    ])
    print(f"{name}: {seconds:.1f}s")
    return out


def card(name: str, seconds: float, lines: list[tuple[str, int, str, int]]) -> pathlib.Path:
    out = ROOT / f"b-{name}.mp4"
    filters = [
        f"drawtext=fontfile={FONT}:text='{text}':fontcolor={color}:fontsize={size}:"
        f"x=(w-text_w)/2:y={offset}"
        for text, size, color, offset in lines
    ]
    run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-loop", "1", "-framerate", str(FPS), "-i", str(ROOT / "wallpaper.png"),
        "-vf", ",".join(filters),
        "-frames:v", str(int(round(seconds * FPS))), "-r", str(FPS),
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        str(out),
    ])
    print(f"{name}: {seconds}s")
    return out


def logo(name: str, seconds: float, lines: list[tuple[str, int, str, int]]) -> pathlib.Path:
    out = ROOT / f"b-{name}.mp4"
    draw = [
        f"drawtext=fontfile={FONT}:text='{text}':fontcolor={color}:fontsize={size}:"
        f"x=(w-text_w)/2:y={offset}"
        for text, size, color, offset in lines
    ]
    filters = ";".join([
        "[1:v]scale=150:-1,format=rgba[logo]",
        "[0:v][logo]overlay=(W-w)/2:(H-h)/2-150[withlogo]",
        f"[withlogo]{','.join(draw)}[out]",
    ])
    run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-loop", "1", "-framerate", str(FPS), "-i", str(ROOT / "wallpaper.png"),
        "-loop", "1", "-framerate", str(FPS), "-i", str(ROOT / "logo.png"),
        "-filter_complex", filters, "-map", "[out]",
        "-frames:v", str(int(round(seconds * FPS))), "-r", str(FPS),
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        str(out),
    ])
    print(f"{name}: {seconds}s")
    return out


segments = [
    logo("logo", 1.6, [
        ("GPUIxUI", 66, "0xf5f5f7", "h/2-40"),
        ("React · Tailwind · shadcn · GPUI", 26, "0x9a9aa2", "h/2+40"),
    ]),
    section("files", 0, 150, "React, Tailwind, shadcn — and GPUI under it."),
    section("board", 150, 150, "Blocks, with real state."),
    section("windows", 300, 150, "Windows 11."),
    section("linux", 600, 150, "Linux."),
    section("omarchy", 750, 150, "Omarchy, dark."),
    section("omarchy-light", 900, 170, "Follows your theme."),
    logo("end", 3.6, [
        ("gpuixui.sudokw.com", 36, "0xd2d2d7", "h/2+10"),
        ("SHADCN REGISTRY · @SUDOKW", 18, "0x86868b", "h/2+70"),
    ]),
]

listing = ROOT / "b-segments.txt"
listing.write_text("".join(f"file '{segment}'\n" for segment in segments))

run([
    "ffmpeg", "-y", "-loglevel", "error",
    "-f", "concat", "-safe", "0", "-i", str(listing),
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    str(ROOT / "b-picture.mp4"),
])
print("picture written")
