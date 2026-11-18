import json
import os
import subprocess
import tempfile
import numpy as np
import librosa
from scipy.signal import correlate

DIR = "/Users/rongyi/Desktop/dsh-team-kanban/media/launch-v5"
BGM_MP3 = os.path.join(DIR, "public/audio/house-vibez.mp3")
MP4_BGM = os.path.join(DIR, "out/kanban-launch-v5.mp4")
MP4_NOBGM = os.path.join(DIR, "out/kanban-launch-v5-nobgm.mp4")
BEAT_JSON = os.path.join(DIR, "analysis/beat_data.json")
OUT_REPORT = os.path.join(DIR, "analysis/post_render_audit.json")
FPS = 30.0


def volumedetect(mp4_path):
    p = subprocess.run(
        ["ffmpeg", "-v", "info", "-i", mp4_path, "-af", "volumedetect", "-f", "null", "-"],
        capture_output=True,
        text=True,
    )
    max_vol, mean_vol = None, None
    for line in p.stderr.splitlines():
        if "max_volume:" in line:
            max_vol = float(line.split("max_volume:")[1].split("dB")[0].strip())
        if "mean_volume:" in line:
            mean_vol = float(line.split("mean_volume:")[1].split("dB")[0].strip())
    return {"max_volume_db": max_vol, "mean_volume_db": mean_vol}


with tempfile.TemporaryDirectory() as tmp:
    wav_bgm = os.path.join(tmp, "render_bgm.wav")
    wav_nobgm = os.path.join(tmp, "render_nobgm.wav")
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", MP4_BGM, "-vn", "-ac", "1", "-ar", "48000", wav_bgm],
        check=True,
    )
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", MP4_NOBGM, "-vn", "-ac", "1", "-ar", "48000", wav_nobgm],
        check=True,
    )

    y_src, sr = librosa.load(BGM_MP3, sr=48000, mono=True, duration=15.0)
    y_ren, _ = librosa.load(wav_bgm, sr=48000, mono=True, duration=15.0)
    y_sfx, _ = librosa.load(wav_nobgm, sr=48000, mono=True)

    # Subtract pure SFX stem from rendered BGM+SFX mix to isolate the exact rendered BGM bed!
    n_cmp = min(len(y_src), len(y_ren), len(y_sfx))
    y_bed = y_ren[:n_cmp] - y_sfx[:n_cmp]
    # Skip first 1.0s fade-in window so correlation locks on steady-state waveform
    s0 = int(1.0 * sr)
    s1 = int(12.0 * sr)
    a = y_bed[s0:s1] - np.mean(y_bed[s0:s1])
    b = y_src[s0:s1] - np.mean(y_src[s0:s1])
    corr = correlate(a, b, mode="full", method="fft")
    lag_samples = int(np.argmax(corr)) - (len(b) - 1)
    offset_sec = lag_samples / float(sr)
    offset_frames = offset_sec * FPS

    # Re-measure beat grid directly on full rendered BGM bed (music-beat-sync.md §5b)
    y_ren_full, _ = librosa.load(wav_bgm, sr=22050, mono=True)
    y_sfx_22k, _ = librosa.load(wav_nobgm, sr=22050, mono=True)
    m_len = min(len(y_ren_full), len(y_sfx_22k))
    y_bed_full = y_ren_full[:m_len] - y_sfx_22k[:m_len]
    _, y_perc = librosa.effects.hpss(y_bed_full)
    full_env = librosa.onset.onset_strength(y=y_perc, sr=22050, hop_length=128)
    full_times = librosa.times_like(full_env, sr=22050, hop_length=128)

    with open(BEAT_JSON) as f:
        bd = json.load(f)
    src_t0 = float(bd["t0"])
    T = float(bd["T"])

    # Measure actual rendered beat peaks near expected grid
    measured_beats = []
    for n in range(77):
        exp_t = src_t0 + offset_sec + n * T
        if exp_t >= len(y_bed_full) / 22050.0:
            break
        mask = np.abs(full_times - exp_t) <= 0.035
        if np.any(mask):
            idx = np.where(mask)[0]
            measured_beats.append((n, float(full_times[idx[np.argmax(full_env[idx])]])))

    ns = np.array([x[0] for x in measured_beats], dtype=float)
    ts = np.array([x[1] for x in measured_beats], dtype=float)
    A = np.vstack([ns, np.ones_like(ns)]).T
    (T_ren, t0_ren), *_ = np.linalg.lstsq(A, ts, rcond=None)
    T_ren = float(T_ren)
    t0_ren = float(t0_ren)

    # Check every designed cut point (with current OUTPUT_AUDIO_OFFSET_SEC in timeline.ts)
    # Read OUTPUT_AUDIO_OFFSET_SEC from src/timeline.ts
    with open(os.path.join(DIR, "src/timeline.ts")) as tf:
        tl_txt = tf.read()
    cur_off = float(tl_txt.split("OUTPUT_AUDIO_OFFSET_SEC =")[1].split(";")[0].strip())

    cut_beats = [
        ("s2_hero", 8),
        ("c1_title", 20),
        ("s3_flow", 24),
        ("c2_title", 36),
        ("s4_theme", 40),
        ("s5_disarm", 52),
        ("s6_outro", 64),
        ("END", 76),
    ]
    cut_errors = []
    for name, bn in cut_beats:
        designed_f = int(round((src_t0 + cur_off + bn * T) * FPS))
        measured_f = float((t0_ren + bn * T_ren) * FPS)
        err_f = float(round(designed_f - measured_f, 2))
        cut_errors.append(
            {
                "cut": name,
                "beat": int(bn),
                "designed_frame": designed_f,
                "measured_beat_frame": float(round(measured_f, 2)),
                "error_frames": err_f,
                "pass_3f": bool(abs(err_f) <= 3.0),
            }
        )

    vol_bgm = volumedetect(MP4_BGM)
    vol_nobgm = volumedetect(MP4_NOBGM)

    # Check SFX audibility across all 8 segments on rendered no-BGM stem (final-review.md A6)
    sfx_rms_db = float(20.0 * np.log10(float(np.max(np.abs(y_sfx))) + 1e-12))
    seg_windows = [
        ("s1_open", 0, 121),
        ("s2_hero", 121, 298),
        ("c1_title", 298, 357),
        ("s3_flow", 357, 534),
        ("c2_title", 534, 593),
        ("s4_theme", 593, 770),
        ("s5_disarm", 770, 947),
        ("s6_outro", 947, 1124),
    ]
    segment_sfx_peaks = []
    for seg_id, f0, f1 in seg_windows:
        i0 = max(0, int((f0 / FPS) * sr))
        i1 = min(len(y_sfx), int((f1 / FPS) * sr))
        pk = float(np.max(np.abs(y_sfx[i0:i1]))) if i1 > i0 else 0.0
        pk_db = float(round(20.0 * np.log10(pk + 1e-12), 2))
        segment_sfx_peaks.append({"segment": seg_id, "peak_dbfs": pk_db, "audible": bool(pk_db > -28.0)})

    # Multi-probe sharp SFX residual verification on rendered no-BGM stem (sound-design.md §4.6 & A9)
    sfx_probes_spec = [
        ("s3-drawer", 357 + 28, "switch-click-quick.mp3", 0),
        ("s4-toggle", 593 + 15, "switch-light.mp3", 2),
        ("s5-click1", 770 + 44, "click-camera.mp3", 6),
        ("s6-impact", 947 + 46, "impact-deep-whoosh.mp3", 19),
    ]
    sfx_probe_residuals = []
    for cue_id, target_f, fname, peak_f in sfx_probes_spec:
        y_cue, _ = librosa.load(os.path.join(DIR, "public/audio", fname), sr=sr, mono=True, duration=1.5)
        seq_from_f = max(0, round(target_f - peak_f - cur_off * FPS))
        exp_start_s = seq_from_f / FPS
        w0 = max(0, int((exp_start_s - 0.15) * sr))
        w1 = min(len(y_sfx), w0 + len(y_cue) + int(0.35 * sr))
        seg = y_sfx[w0:w1]
        c = correlate(seg, y_cue, mode="valid", method="fft")
        best_i = int(np.argmax(c))
        actual_start_s = (w0 + best_i) / float(sr)
        actual_peak_f = (actual_start_s + peak_f / FPS) * FPS
        res_f = float(round(actual_peak_f - target_f, 2))
        sfx_probe_residuals.append(
            {
                "cue": cue_id,
                "file": fname,
                "target_frame": int(target_f),
                "measured_peak_frame": float(round(actual_peak_f, 2)),
                "residual_frames": res_f,
                "pass_1f": bool(abs(res_f) <= 1.0),
            }
        )

    report = {
        "measured_date": "2026-11-17",
        "pipeline": {
            "engine": "Remotion 4.0.484",
            "renderer": "Chromium Headless + ANGLE",
            "codec_container": "FFmpeg 7.1 libx264 + AAC 48kHz MP4",
            "probe": "Normalized FFT cross-correlation (rendered BGM bed + 4 sharp Foley SFX probes @ 48kHz)",
        },
        "measured_output_audio_offset_sec": float(round(offset_sec, 6)),
        "measured_output_audio_offset_frames": float(round(offset_frames, 3)),
        "configured_output_audio_offset_sec": float(cur_off),
        "rendered_grid": {"bpm": float(round(60.0 / T_ren, 4)), "t0": float(round(t0_ren, 6)), "T": float(round(T_ren, 6))},
        "cut_errors": cut_errors,
        "max_abs_cut_error_frames": float(round(max(abs(c["error_frames"]) for c in cut_errors), 2)),
        "sfx_probe_residuals": sfx_probe_residuals,
        "volumedetect_bgm": vol_bgm,
        "volumedetect_nobgm": vol_nobgm,
        "nobgm_peak_dbfs": float(round(sfx_rms_db, 2)),
        "segment_sfx_peaks": segment_sfx_peaks,
    }
    with open(OUT_REPORT, "w") as f:
        json.dump(report, f, indent=2)
    print(json.dumps(report, indent=2))
