#!/usr/bin/env python3
"""Cuts the reel from captured frames. Usage: reel-cut.py <frames dir> <out dir> <reference.mp4> <score.wav> <sfx.wav>"""
import re, subprocess, sys
from reel_edits import C, FLEX, OPENING

frames, out, ref, score, sfx = sys.argv[1:]
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
for name in ["opening", "flex"]:
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", "60", "-i", f"{frames}/{name}/%04d.png", "-vf", "format=yuv420p", "-c:v", "libx264", "-crf", "12", "-preset", "fast", f"{out}/{name}.mp4"], check=True)
open(f"{out}/film.txt", "w").write(f"file '{out}/opening.mp4'\nfile '{out}/flex.mp4'\nfile '{out}/ours.mp4'\n")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{out}/film.txt", "-c", "copy", f"{out}/picture.mp4"], check=True)
fire = "anoisesrc=d=5.6:c=brown:a=0.4:r=48000,lowpass=f=700,highpass=f=70,tremolo=f=7:d=0.5,afade=t=in:st=0.6:d=1.4,afade=t=out:st=4.2:d=1.3[bed];anoisesrc=d=5.6:c=white:a=0.35:r=48000:s=7,highpass=f=2400,tremolo=f=23:d=1,tremolo=f=9.7:d=1,volume=0.5,afade=t=in:st=0.7:d=1,afade=t=out:st=4.1:d=1.2[crackle];"
peak = float(re.search(r"max_volume: (-?[\d.]+)", subprocess.run(["ffmpeg", "-hide_banner", "-i", score, "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr).group(1))
mix = fire + f"[1:a]aresample=48000,volume={-8 - peak}dB,aformat=channel_layouts=stereo[music];[2:a]aresample=48000,volume=-4dB,aformat=channel_layouts=stereo[fx];[bed][crackle]amix=inputs=2:normalize=0,aformat=channel_layouts=stereo[burn];[burn][music][fx]amix=inputs=3:duration=longest:normalize=0,alimiter=limit=0.97:attack=5:release=60[a]"
film = f"{out}/gpuixui-sets-the-ui-on-fire.mp4"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{out}/picture.mp4", "-i", score, "-i", sfx, "-filter_complex", mix, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", film], check=True)
lab = "drawtext=text='{}':x=20:y=h-46:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.6"
sbs = f"[0:v]fps=60,scale=960:540,{lab.format('theirs')}[a];[1:v]scale=960:540,{lab.format('ours')}[b];[a][b]hstack,format=yuv420p[v]"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", ref, "-i", f"{out}/ours.mp4", "-ss", str(OPENING + FLEX), "-i", film, "-filter_complex", sbs, "-map", "[v]", "-map", "2:a", "-shortest", "-c:v", "libx264", "-crf", "16", "-preset", "fast", "-c:a", "aac", "-b:a", "256k", f"{out}/theirs-vs-ours.mp4"], check=True)
