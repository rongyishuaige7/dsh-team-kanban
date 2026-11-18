#!/usr/bin/env python3
"""Export `kanban-launch-v5` Remotion timeline into an editable Jianying Pro draft.

Follows `~/.agents/video-shotcraft/references/jianying-export.md`:
- `底片` video track: `out/plate.mp4` sliced at the 8 exact beat-locked shot cuts
- `字幕ZH` & `字幕EN` editable native text tracks
- `SFX1..N` greedy-laned non-overlapping Foley audio tracks (without Remotion's
  AAC output offset compensation, per jianying-export.md §3)
- `BGM` audio track (`house-vibez.mp3`)
"""

import os
import sys
import pyJianYingDraft as draft

SKILL_JY = os.path.expanduser("~/.agents/video-shotcraft/jianying-export")
sys.path.insert(0, SKILL_JY)
import mac_draft  # noqa: E402

DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLATE = os.path.join(DIR, "out/plate.mp4")
AUDIO_DIR = os.path.join(DIR, "public/audio")
BGM_PATH = os.path.join(AUDIO_DIR, "house-vibez.mp3")
STAGING = os.path.join(DIR, "out/jianying")
DRAFT_NAME = "dsh-team-kanban-v5"

FPS = 30
# Note: in Jianying timeline playback, use pure SOURCE_BEAT0 (no Remotion AAC output offset!)
BEAT0 = 0.061121
BEAT_INT = 0.491747
OUT_OFF = 0.0427  # Remotion timeline shot boundaries match plate.mp4 frame numbers


def beat_f_plate(n: int) -> int:
    return round((BEAT0 + OUT_OFF + n * BEAT_INT) * FPS)


def f2us(f: int) -> int:
    return round(f * 1_000_000 / FPS)


b8 = beat_f_plate(8)
b20 = beat_f_plate(20)
b24 = beat_f_plate(24)
b36 = beat_f_plate(36)
b40 = beat_f_plate(40)
b52 = beat_f_plate(52)
b64 = beat_f_plate(64)
b76 = beat_f_plate(76)
TOTAL_F = b76

SHOTS = [
    ("s1_open", 0, b8),
    ("s2_hero", b8, b20),
    ("c1_title", b20, b24),
    ("s3_flow", b24, b36),
    ("c2_title", b36, b40),
    ("s4_theme", b40, b52),
    ("s5_disarm", b52, b64),
    ("s6_outro", b64, b76),
]

CAPTIONS = [
    ("贝塞尔血缘连线 · 跨列 FLIP 实时流转", "Bézier lineage curves · Live cross-lane FLIP", b24 + 10, b36 - 12, False),
    ("360px 窄栏静默折叠 · 深浅双色无缝同构", "360px quiet empty lanes · Pixel-identical themes", b40 + 44, b52 - 12, True),
    ("一键停用团队协作 · 任务保留，收起零残留", "One-click team disarm · Tasks kept, zero residue", b52 + 10, b64 - 14, False),
]

PEAK_F = {
    "air-whoosh-powerful.mp3": 7,
    "air-woosh-deep.mp3": 15,
    "click-camera.mp3": 6,
    "impact-deep-whoosh.mp3": 19,
    "light-sweep-magic.mp3": 48,
    "lock-quick.mp3": 1,
    "pen-write-paper.mp3": 2,
    "riser-cine.mp3": 35,
    "shimmer-sparkle-sweep.mp3": 28,
    "sweep-fast-small.mp3": 10,
    "switch-click-quick.mp3": 0,
    "switch-light.mp3": 2,
    "switch-tap.mp3": 0,
    "swoosh-quick.mp3": 10,
    "transition-snap.mp3": 3,
    "transition-soft.mp3": 13,
    "whoosh-fast.mp3": 22,
    "wind-woosh-throw.mp3": 5,
}

# (src, target_peak_frame, duration_frames, volume)
SFX_SPEC = [
    ("pen-write-paper.mp3", 5, 28, 0.72),
    ("transition-soft.mp3", 22, 39, 0.42),
    ("whoosh-fast.mp3", b8 - 4, 50, 0.56),
    ("switch-tap.mp3", b8 + 3, 26, 0.46),
    ("air-whoosh-powerful.mp3", b8 + 58, 52, 0.48),
    ("light-sweep-magic.mp3", b8 + 76, 72, 0.68),
    ("transition-snap.mp3", b8 + 144, 18, 0.58),
    ("swoosh-quick.mp3", b20 + 8, 24, 0.48),
    ("transition-soft.mp3", b24 + 8, 39, 0.40),
    ("switch-click-quick.mp3", b24 + 28, 24, 0.44),
    ("wind-woosh-throw.mp3", b24 + 105, 29, 0.48),
    ("lock-quick.mp3", b24 + 145, 30, 0.46),
    ("swoosh-quick.mp3", b36 + 8, 24, 0.48),
    ("switch-light.mp3", b40 + 15, 12, 1.00),
    ("air-woosh-deep.mp3", b40 + 42, 78, 0.50),
    ("click-camera.mp3", b52 + 44, 12, 0.78),
    ("switch-tap.mp3", b52 + 89, 28, 0.52),
    ("sweep-fast-small.mp3", b52 + 96, 24, 0.50),
    ("riser-cine.mp3", b64, 52, 0.48),
    ("swoosh-quick.mp3", b64 + 8, 24, 0.46),
    ("impact-deep-whoosh.mp3", b64 + 46, 96, 0.58),
    ("shimmer-sparkle-sweep.mp3", b64 + 72, 84, 0.42),
]

if not os.path.exists(PLATE):
    raise SystemExit(f"Missing plate video {PLATE}; run `npm run render:plate` first.")

os.makedirs(STAGING, exist_ok=True)
folder = draft.DraftFolder(STAGING)
script = folder.create_draft(DRAFT_NAME, 1920, 1080, fps=FPS, allow_replace=True)

script.append_track(draft.TrackSpec(draft.TrackType.video, name="底片"))
script.append_track(draft.TrackSpec(draft.TrackType.audio, name="BGM"))
script.append_track(draft.TrackSpec(draft.TrackType.text, name="字幕EN"))
script.append_track(draft.TrackSpec(draft.TrackType.text, name="字幕ZH"))

plate_mat = draft.VideoMaterial(PLATE)
for _name, f0, f1 in SHOTS:
    rng = draft.Timerange(f2us(f0), f2us(f1) - f2us(f0))
    script.add_segment(draft.VideoSegment(plate_mat, rng, source_timerange=rng), "底片")

sfx_segs = []
for fname, target_f, dur_f, vol in SFX_SPEC:
    mat = draft.AudioMaterial(os.path.join(AUDIO_DIR, fname))
    start_f = max(0, target_f - PEAK_F.get(fname, 0))
    dur_us = min(f2us(dur_f), mat.duration, f2us(TOTAL_F - start_f))
    sfx_segs.append((f2us(start_f), dur_us, mat, min(1.0, vol)))

lanes, placed = [], []
for start, dur, mat, vol in sorted(sfx_segs, key=lambda x: x[0]):
    lane = next((i for i, end in enumerate(lanes) if end <= start), len(lanes))
    if lane == len(lanes):
        lanes.append(0)
    lanes[lane] = start + dur
    placed.append((lane, start, dur, mat, vol))

for i in range(len(lanes)):
    script.append_track(draft.TrackSpec(draft.TrackType.audio, name=f"SFX{i+1}"))
for lane, start, dur, mat, vol in placed:
    script.add_segment(draft.AudioSegment(mat, draft.Timerange(start, dur), volume=vol), f"SFX{lane+1}")

bgm_mat = draft.AudioMaterial(BGM_PATH)
script.add_segment(
    draft.AudioSegment(bgm_mat, draft.Timerange(0, min(bgm_mat.duration, f2us(TOTAL_F))), volume=0.31),
    "BGM",
)

for zh, en, f0, f1, is_dark in CAPTIONS:
    rng = draft.Timerange(f2us(f0), f2us(f1) - f2us(f0))
    fg = (0.96, 0.97, 0.98) if is_dark else (0.06, 0.07, 0.08)
    bg_hex = "#15161C" if is_dark else "#FFFFFF"
    script.add_segment(
        draft.TextSegment(
            zh,
            rng,
            style=draft.TextStyle(size=5.6, color=fg, bold=True),
            clip_settings=draft.ClipSettings(transform_y=-0.78),
            background=draft.TextBackground(color=bg_hex, alpha=0.88, round_radius=0.45),
        ),
        "字幕ZH",
    )
    script.add_segment(
        draft.TextSegment(
            en,
            rng,
            style=draft.TextStyle(size=3.6, color=fg),
            clip_settings=draft.ClipSettings(transform_y=-0.89),
            background=draft.TextBackground(color=bg_hex, alpha=0.78, round_radius=0.45),
        ),
        "字幕EN",
    )

script.save()
draft_dir = os.path.join(STAGING, DRAFT_NAME)
info = mac_draft.macify(draft_dir, DRAFT_NAME, bundle_media=True, allow_missing_fingerprint=True)
print(f"[Jianying] Self-contained Mac draft generated at: {draft_dir}")
if os.path.isdir(mac_draft.DRAFT_ROOT) and not mac_draft.jianying_running():
    mac_draft.install(draft_dir, DRAFT_NAME, info)
    print(f"[Jianying] Installed into Jianying library: {mac_draft.DRAFT_ROOT}/{DRAFT_NAME}")
else:
    print("[Jianying] Local Jianying library not detected (or Jianying is open); draft bundle is ready in out/jianying/.")
