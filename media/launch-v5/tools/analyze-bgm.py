import json
import os
import sys
import numpy as np
import librosa
from scipy.signal import butter, sosfilt

BGM_DIR = "/Users/rongyi/.agents/video-shotcraft/assets/audio/bgm"
OUT_DIR = "/Users/rongyi/Desktop/dsh-team-kanban/media/launch-v5/analysis"
os.makedirs(OUT_DIR, exist_ok=True)


def band_env(y, sr, lo, hi):
    nyq = sr / 2.0
    hi = min(hi, nyq * 0.95)
    sos = butter(4, [lo, hi], btype="band", fs=sr, output="sos")
    filtered = sosfilt(sos, y)
    env = librosa.onset.onset_strength(y=filtered, sr=sr, hop_length=256)
    times = librosa.times_like(env, sr=sr, hop_length=256)
    return env, times


def analyze_track(name):
    path = os.path.join(BGM_DIR, name)
    y, sr = librosa.load(path, sr=None, mono=True)
    dur = len(y) / sr
    # Separate percussive stem for sharper transient lock
    _, y_perc = librosa.effects.hpss(y)

    tempo_scalar, beats = librosa.beat.beat_track(
        y=y_perc, sr=sr, tightness=400, units="time", hop_length=256
    )
    i = np.arange(len(beats))
    A = np.vstack([i, np.ones_like(i)]).T
    (T_base, t0_base), *_ = np.linalg.lstsq(A, beats, rcond=None)

    # Detect true percussive onsets + kick/snare/hihat envelopes
    onset_frames = librosa.onset.onset_detect(
        y=y_perc, sr=sr, hop_length=256, backtrack=False, units="frames"
    )
    onsets = librosa.frames_to_time(onset_frames, sr=sr, hop_length=256)
    kick_env, env_times = band_env(y_perc, sr, 40, 160)
    snare_body, _ = band_env(y_perc, sr, 150, 500)
    snare_snap, _ = band_env(y_perc, sr, 1000, 3000)
    snare_env = np.sqrt(np.maximum(snare_body, 0) * np.maximum(snare_snap, 0))
    hihat_env, _ = band_env(y_perc, sr, 6000, 14000)

    # Evaluate 0.5x, 1x, 2x candidate grids against kick + percussive onsets (first 45s)
    eval_dur = min(dur, 45.0)
    candidates = []
    for label, factor in [("0.5x", 2.0), ("1x", 1.0), ("2x", 0.5)]:
        T_c = T_base * factor
        bpm_c = 60.0 / T_c
        # Find earliest beat >= 0 aligned with phase t0_base
        k_start = int(np.ceil(-t0_base / T_c))
        t0_c = t0_base + k_start * T_c
        n_beats = int(np.floor((eval_dur - t0_c) / T_c)) + 1
        grid = t0_c + np.arange(n_beats) * T_c

        # Align each grid beat to nearest onset within +/- 60ms
        diffs = []
        matched = 0
        kick_on_int = []
        kick_on_half = []
        for idx, gt in enumerate(grid):
            if len(onsets) > 0:
                nearest = onsets[np.argmin(np.abs(onsets - gt))]
                err_ms = (nearest - gt) * 1000.0
                if abs(err_ms) <= 35.0:
                    matched += 1
                    diffs.append((gt, err_ms))
            ki = np.argmin(np.abs(env_times - gt))
            kick_on_int.append(float(kick_env[ki]))
            if idx + 1 < len(grid):
                ht = gt + 0.5 * T_c
                khi = np.argmin(np.abs(env_times - ht))
                kick_on_half.append(float(kick_env[khi]))

        match_pct = (matched / max(1, len(grid))) * 100.0
        abs_errs = [abs(d[1]) for d in diffs] if diffs else [999.0]
        mean_abs_ms = float(np.mean(abs_errs))
        if len(diffs) >= 4:
            ts_d = np.array([d[0] for d in diffs])
            es_d = np.array([d[1] for d in diffs])
            slope, _ = np.polyfit(ts_d, es_d, 1)
            cum_drift_ms = float(abs(slope) * eval_dur)
        else:
            cum_drift_ms = 999.0
        beat0_err = (
            float(np.min(np.abs(onsets - t0_c)) * 1000.0) if len(onsets) else 999.0
        )
        candidates.append(
            {
                "label": label,
                "bpm": round(float(bpm_c), 4),
                "t0": round(float(t0_c), 6),
                "T": round(float(T_c), 6),
                "match_pct": round(match_pct, 2),
                "mean_abs_ms": round(mean_abs_ms, 2),
                "cum_drift_ms_45s": round(cum_drift_ms, 2),
                "beat0_nearest_onset_ms": round(beat0_err, 2),
                "mean_kick_int": round(float(np.mean(kick_on_int)), 3),
                "mean_kick_half": round(float(np.mean(kick_on_half)), 3),
            }
        )

    # Also refine 1x grid directly on nearest strong percussive peaks around beat_track beats!
    refined_beats = []
    win_sec = 0.035
    full_env = librosa.onset.onset_strength(y=y_perc, sr=sr, hop_length=128)
    full_times = librosa.times_like(full_env, sr=sr, hop_length=128)
    for bt in beats[beats <= eval_dur]:
        mask = np.abs(full_times - bt) <= win_sec
        if np.any(mask):
            sub_idx = np.where(mask)[0]
            peak_t = full_times[sub_idx[np.argmax(full_env[sub_idx])]]
            refined_beats.append(float(peak_t))
        else:
            refined_beats.append(float(bt))
    ir = np.arange(len(refined_beats))
    Ar = np.vstack([ir, np.ones_like(ir)]).T
    (T_ref, t0_ref), *_ = np.linalg.lstsq(Ar, np.array(refined_beats), rcond=None)
    res_ms = (np.array(refined_beats) - (t0_ref + ir * T_ref)) * 1000.0

    # RMS curve & hits on 1x refined grid over first 45s
    k_start = int(np.ceil(-t0_ref / T_ref))
    t0_ref = float(t0_ref + k_start * T_ref)
    T_ref = float(T_ref)
    bpm_ref = float(60.0 / T_ref)
    n_total = int(np.floor((eval_dur - t0_ref) / T_ref)) + 1
    beat_list = [float(t0_ref + n * T_ref) for n in range(n_total)]

    hits = []
    for n, bt in enumerate(beat_list):
        ki = int(np.argmin(np.abs(env_times - bt)))
        ke = float(kick_env[ki])
        se = float(snare_env[ki])
        he = float(hihat_env[ki])
        hits.append(
            {
                "beat": n,
                "t": round(bt, 5),
                "s": round(ke, 3),
                "k": "kick" if ke >= se else "snare",
                "kick": round(ke, 3),
                "snare": round(se, 3),
                "hihat": round(he, 3),
            }
        )

    rms_vals = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
    rms_times = librosa.times_like(rms_vals, sr=sr, hop_length=512)
    rms_per_bar = []
    for b in range(0, n_total, 4):
        t_start = beat_list[b]
        t_end = beat_list[min(b + 4, n_total - 1)] + T_ref
        mask = (rms_times >= t_start) & (rms_times < t_end)
        val = float(np.mean(rms_vals[mask])) if np.any(mask) else 0.0
        rms_per_bar.append(
            {
                "bar": b // 4,
                "beat_start": b,
                "t_start": round(t_start, 4),
                "rms": round(val, 4),
            }
        )

    return {
        "track": name,
        "sr": sr,
        "duration_sec": round(dur, 3),
        "scalar_tempo": round(float(np.atleast_1d(tempo_scalar)[0]), 3),
        "refined": {
            "bpm": round(bpm_ref, 4),
            "t0": round(t0_ref, 6),
            "T": round(T_ref, 6),
            "max_abs_residual_ms": round(float(np.max(np.abs(res_ms))), 2),
            "mean_abs_residual_ms": round(float(np.mean(np.abs(res_ms))), 2),
        },
        "candidates": candidates,
        "rms_per_bar": rms_per_bar[:24],
        "top_kick_beats": sorted(hits, key=lambda h: h["kick"], reverse=True)[:10],
        "beats": beat_list,
        "hits": hits,
    }


results = {}
for track in ["house-vibez.mp3", "cat-walk.mp3"]:
    r = analyze_track(track)
    results[track] = r
    print(f"=== {track} ===")
    print("Refined:", r["refined"])
    for c in r["candidates"]:
        print("  cand:", c)
    print("  RMS bars 0..19:", [(x["bar"], x["beat_start"], x["t_start"], x["rms"]) for x in r["rms_per_bar"][:20]])
    print("  Top kicks:", [(x["beat"], x["t"], x["kick"]) for x in r["top_kick_beats"][:6]])

with open(os.path.join(OUT_DIR, "audition_candidates.json"), "w") as f:
    json.dump(results, f, indent=2)
