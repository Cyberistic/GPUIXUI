#!/usr/bin/env python3
"""Cuts the reel from captured frames. Usage: reel-cut.py <frames dir> <out dir> <reference.mp4>"""
import subprocess, sys

frames, out, ref = sys.argv[1:]
# scene, start in the reference, duration, scene time at the cut's first frame, crop (x, y, width) in 1920 space
C = [
    ("hello", 0.0, 1.333, 0.0), ("settings", 1.333, 1.333, 0.0), ("diff", 2.667, 1.333, 0.0), ("table", 4.0, 1.333, 0.0),
    ("today", 5.333, 1.333, 0.0), ("op1", 6.667, 1.333, 0.0), ("nowplaying", 8.0, 1.333, 0.4), ("launcher", 9.333, 0.667, 0.0),
    ("ask", 10.0, 0.667, 0.17), ("library", 10.667, 1.333, 0.3), ("fire", 12.0, 1.333, 0.29), ("pricing", 13.333, 1.333, 0.75),
    ("deploy", 14.667, 1.333, 0.55), ("ask", 16.0, 1.333, 0.8), ("keys", 17.333, 1.333, 0.0), ("fire", 18.667, 0.667, 1.7),
    ("library", 19.333, 0.667, 2.0), ("ask", 20.0, 0.667, 2.2), ("keys", 20.667, 0.667, 1.55),
    ("keys", 21.333, 0.667, 2.1, (918, 383, 960)), ("fire", 22.0, 0.667, 2.4, (554, 272, 1263)), ("pricing", 22.667, 0.667, 1.35),
    ("library", 23.333, 0.667, 1.0, (260, 240, 960)), ("nowplaying", 24.0, 0.667, 1.6, (812, 184, 800)), ("nowplaying", 24.667, 0.667, 1.9, (920, 48, 1000)),
    ("today", 25.333, 0.667, 1.0), ("fire", 26.0, 0.667, 3.1), ("fire", 26.667, 0.333, 3.6, (554, 272, 1263)), ("pricing", 27.0, 0.333, 2.05),
    ("keys", 27.333, 0.333, 2.8, (918, 383, 960)), ("library", 27.667, 0.333, 1.0, (560, 300, 800)), ("nowplaying", 28.0, 0.333, 2.2, (812, 184, 800)),
    ("today", 28.333, 0.333, 2.0), ("library", 28.667, 0.333, 2.0), ("deploy", 29.0, 0.333, 1.7, (466, 363, 1090)), ("logo", 29.333, 2.0, 0.0), ("card", 31.333, 2.288, 2.2),
]
parts = []
for i, c in enumerate(C):
    scene, _, dur, t0 = c[:4]
    vf = "format=yuv420p"
    if len(c) > 4:
        x, y, w = c[4]
        vf = f"crop={w}:{round(w * 9 / 16)}:{x}:{y},scale=1920:1080:flags=lanczos,format=yuv420p"
    path = f"{out}/cut-{i:02d}.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", "60", "-start_number", str(round(t0 * 60)), "-i", f"{frames}/{scene}/%04d.png", "-frames:v", str(round(dur * 60)), "-vf", vf, "-c:v", "libx264", "-crf", "12", "-preset", "fast", path], check=True)
    parts.append(path)
open(f"{out}/list.txt", "w").write("".join(f"file '{p}'\n" for p in parts))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{out}/list.txt", "-c", "copy", f"{out}/ours.mp4"], check=True)
lab = "drawtext=text='{}':x=20:y=h-46:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.6"
sbs = f"[0:v]fps=60,scale=960:540,{lab.format('theirs')}[a];[1:v]scale=960:540,{lab.format('ours')}[b];[a][b]hstack,format=yuv420p"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", ref, "-i", f"{out}/ours.mp4", "-filter_complex", sbs, "-shortest", "-c:v", "libx264", "-crf", "16", "-preset", "fast", f"{out}/theirs-vs-ours.mp4"], check=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", "60", "-i", f"{frames}/opening/%04d.png", "-vf", "format=yuv420p", "-c:v", "libx264", "-crf", "12", "-preset", "fast", f"{out}/opening.mp4"], check=True)
open(f"{out}/film.txt", "w").write(f"file '{out}/opening.mp4'\nfile '{out}/ours.mp4'\n")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{out}/film.txt", "-c", "copy", f"{out}/picture.mp4"], check=True)
fire = "anoisesrc=d=5.6:c=brown:a=0.55:r=48000,lowpass=f=700,highpass=f=70,tremolo=f=7:d=0.5,afade=t=in:st=0.6:d=1.4,afade=t=out:st=4.4:d=1.1[bed];anoisesrc=d=5.6:c=white:a=0.5:r=48000:s=7,highpass=f=2400,tremolo=f=23:d=1,tremolo=f=9.7:d=1,volume=0.5,afade=t=in:st=0.7:d=1,afade=t=out:st=4.3:d=1[crackle];"
music = "[1:a]aresample=48000,adelay=5000|5000[track];"
mix = fire + music + "[bed][crackle]amix=inputs=2:normalize=0,aformat=channel_layouts=stereo[burn];[burn][track]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95[a]"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{out}/picture.mp4", "-i", ref, "-filter_complex", mix, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", f"{out}/gpuixui-sets-the-ui-on-fire.mp4"], check=True)
