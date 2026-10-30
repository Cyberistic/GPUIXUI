"""Cut the launch film from the native takes.

Each shot is one ffmpeg pass: the wallpaper, the window (cropped to the shot's
framing, scaled, rounded) and its caption. The passes are concatenated, then the
sound design is muxed in.
"""

import pathlib
import subprocess

ROOT = pathlib.Path("/tmp/film")
FONT = "/System/Library/Fonts/SFNS.ttf"
FPS = 60


def run(args: list[str]) -> None:
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        raise SystemExit(result.stderr[-3000:])


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


def caption(text: str, tint: str = "0xf2f2f7") -> str:
    escaped = text.replace(":", "\\:").replace("'", "’")
    return (
        f"drawtext=fontfile={FONT}:text='{escaped}':fontcolor={tint}:fontsize=28:"
        f"x=(w-text_w)/2:y=52"
    )


def window_shot(
    name: str,
    take: str,
    start: int,
    seconds: float,
    *,
    crop: tuple[int, int, int, int] | None,
    width: int,
    text: str | None,
) -> pathlib.Path:
    """One window shot: a take, a framing, a size and (optionally) a caption."""
    out = ROOT / f"seg-{name}.mp4"
    frames = int(round(seconds * FPS))
    mask_path = mask(width, int(round(width * 620 / 940)))
    height = int(round(width * 620 / 940))
    x = (1920 - width) // 2
    y = (1080 - height) // 2

    filters = ["[0:v]format=rgba[bg]"]
    if crop is None:
        filters.append(f"[1:v]scale={width}:{height},setsar=1,format=rgba[win]")
    else:
        cw, ch, cx, cy = crop
        filters.append(
            f"[1:v]crop={cw}:{ch}:{cx}:{cy},scale={width}:{height},setsar=1,format=rgba[win]"
        )
    filters.append("[win][2:v]alphamerge[rounded]")
    filters.append(f"[bg][rounded]overlay={x}:{y}:format=auto[ov]")
    filters.append(f"[ov]{caption(text)}[out]" if text else "[ov]null[out]")

    run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-loop", "1", "-framerate", str(FPS), "-i", str(ROOT / "wallpaper.png"),
        "-framerate", str(FPS), "-start_number", str(start), "-i", str(ROOT / f"take-{take}" / "%05d.png"),
        "-loop", "1", "-i", str(mask_path),
        "-filter_complex", ";".join(filters),
        "-map", "[out]", "-frames:v", str(frames), "-r", str(FPS),
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        str(out),
    ])
    print(f"{name}: {seconds}s")
    return out


def card_shot(name: str, seconds: float, text: str, size: int, sub: str | None = None) -> pathlib.Path:
    """A still card over the wallpaper: one line, or a number and its unit."""
    out = ROOT / f"seg-{name}.mp4"
    filters = [
        f"drawtext=fontfile={FONT}:text='{text}':fontcolor=0xf5f5f7:fontsize={size}:"
        f"x=(w-text_w)/2:y=(h-text_h)/2-{20 if sub else 0}",
    ]
    if sub:
        filters.append(
            f"drawtext=fontfile={FONT}:text='{sub}':fontcolor=0x86868b:fontsize=28:"
            f"x=(w-text_w)/2:y=(h)/2+{size // 2}"
        )
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


def logo_shot(name: str, seconds: float, *, end: bool) -> pathlib.Path:
    out = ROOT / f"seg-{name}.mp4"
    frames = int(round(seconds * FPS))
    filters = [
        "[1:v]scale=140:-1,format=rgba[logo]",
        f"[0:v][logo]overlay=(W-w)/2:(H-h)/2-{90 if end else 60}[withlogo]",
        f"[withlogo]drawtext=fontfile={FONT}:text='GPUIxUI':fontcolor=0xf5f5f7:fontsize=64:"
        f"x=(w-text_w)/2:y=(h)/2+25[brand]",
    ]
    if end:
        filters.append(
            f"[brand]drawtext=fontfile={FONT}:text='gpuixui.sudokw.com':fontcolor=0xd2d2d7:fontsize=34:"
            f"x=(w-text_w)/2:y=(h)/2+115[url]"
        )
        filters.append(
            f"[url]drawtext=fontfile={FONT}:text='SHADCN REGISTRY':fontcolor=0x86868b:fontsize=18:"
            f"x=(w-text_w)/2:y=(h)/2+170[meta]"
        )
    if end:
        filters.append("[meta]null[out]")
    else:
        filters.append(
            f"[brand]drawtext=fontfile={FONT}:text='Native React, by the GPU':fontcolor=0x86868b:fontsize=26:"
            f"x=(w-text_w)/2:y=(h)/2+105[out]"
        )
    run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-loop", "1", "-framerate", str(FPS), "-i", str(ROOT / "wallpaper.png"),
        "-loop", "1", "-framerate", str(FPS), "-i", str(ROOT / "logo.png"),
        "-filter_complex", ";".join(filters), "-map", "[out]",
        "-frames:v", str(frames), "-r", str(FPS),
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        str(out),
    ])
    print(f"{name}: {seconds}s")
    return out


def triptych(name: str, seconds: float, text: str | None) -> pathlib.Path:
    """Three windows at once: the breadth shot."""
    out = ROOT / f"seg-{name}.mp4"
    width, height = 560, 370
    mask_path = mask(width, height)
    filters = ["[0:v]format=rgba[bg]"]
    for index, take in enumerate(["files", "tasks", "palette"]):
        filters.append(f"[{index + 1}:v]scale={width}:{height},setsar=1,format=rgba[w{index}]")
        filters.append(f"[w{index}][{4}:v]alphamerge[r{index}]")
    filters.append("[bg][r0]overlay=80:330[o0]")
    filters.append("[o0][r1]overlay=680:330[o1]")
    filters.append("[o1][r2]overlay=1280:330[o2]")
    filters.append(f"[o2]{caption(text)}[out]" if text else "[o2]null[out]")
    run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-loop", "1", "-framerate", str(FPS), "-i", str(ROOT / "wallpaper.png"),
        "-framerate", str(FPS), "-start_number", "40", "-i", str(ROOT / "take-files" / "%05d.png"),
        "-framerate", str(FPS), "-start_number", "40", "-i", str(ROOT / "take-tasks" / "%05d.png"),
        "-framerate", str(FPS), "-start_number", "40", "-i", str(ROOT / "take-palette" / "%05d.png"),
        "-loop", "1", "-i", str(mask_path),
        "-filter_complex", ";".join(filters), "-map", "[out]",
        "-frames:v", str(int(round(seconds * FPS))), "-r", str(FPS),
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        str(out),
    ])
    print(f"{name}: {seconds}s")
    return out


segments = [
    logo_shot("logo", 1.8, end=False),
    window_shot("files-wide", "files", 0, 1.6, crop=None, width=1200, text="files, now native."),
    window_shot("files-zoom", "files", 100, 1.2, crop=(700, 460, 140, 130), width=1400, text=None),
    window_shot("tasks-wide", "tasks", 20, 1.4, crop=None, width=1200, text="boards that hold state."),
    window_shot("tasks-zoom", "tasks", 120, 1.2, crop=(720, 470, 30, 100), width=1400, text=None),
    window_shot("palette-wide", "palette", 40, 1.4, crop=None, width=1180, text="command-k."),
    window_shot("palette-zoom", "palette", 140, 1.2, crop=(760, 460, 70, 60), width=1400, text=None),
    card_shot("speed", 1.0, "60", 260, "fps, on the GPU"),
    window_shot("files-zoom2", "files", 220, 1.2, crop=(560, 360, 360, 150), width=1400, text=None),
    window_shot("tasks-back", "tasks", 240, 1.2, crop=None, width=1200, text=None),
    triptych("family", 2.4, "a whole library, one runtime."),
    logo_shot("end", 3.8, end=True),
]

listing = ROOT / "segments.txt"
listing.write_text("".join(f"file '{segment}'\n" for segment in segments))

run([
    "ffmpeg", "-y", "-loglevel", "error",
    "-f", "concat", "-safe", "0", "-i", str(listing),
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    str(ROOT / "picture.mp4"),
])
print("picture written")
