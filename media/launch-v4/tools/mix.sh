#!/bin/bash
# 混音：BGM + 7 处音效，直接对齐画面切点。用法: ./tools/mix.sh <输入mp4> <输出mp4> <with-bgm:1|0>
set -e
FF=${FFMPEG:-ffmpeg}
A=${SHOT_AUDIO:-$HOME/.agents/skills/video-shotcraft/assets/audio}
IN=${1:?input mp4}
OUT=${2:?output mp4}
BGM=${3:-1}
DUR=${DUR:-20.6}

if [ "$BGM" = "1" ]; then
  N=11
  BGMF="[1:a]atrim=0:${DUR},asetpts=N/SR/TB,volume=0.17,afade=t=in:st=0:d=0.8,afade=t=out:st=19.5:d=1.2[bgm];"
  BGMIN='[bgm]'
else
  N=10; BGMF=""; BGMIN=''
fi

$FF -y -loglevel error \
 -i "$IN" \
 -i "$A/bgm/bgm-tech-house.mp3" \
 -i "$A/sfx/transition/air-woosh-quick.mp3" \
 -i "$A/sfx/transition/air-woosh-deep.mp3" \
 -i "$A/sfx/transition/sweep-fast-small.mp3" \
 -i "$A/sfx/impact/bass-hit-futuristic.mp3" \
 -i "$A/sfx/ui/ui-success-soft.mp3" \
 -i "$A/sfx/ui/switch-tap.mp3" \
 -i "$A/sfx/transition/swoosh-quick.mp3" \
 -i "$A/sfx/ui/ui-select-click.mp3" \
 -i "$A/sfx/ui/ui-confirm-tone.mp3" \
 -i "$A/sfx/transition/swoosh-quick.mp3" \
 -filter_complex "\
${BGMF}\
[2:a]adelay=3480|3480,volume=0.30[w1];\
[3:a]adelay=6700|6700,volume=0.34[w2];\
[4:a]adelay=6930|6930,volume=0.22[w3];\
[5:a]adelay=8830|8830,volume=0.42[i1];\
[6:a]adelay=10600|10600,volume=0.30[c1];\
[7:a]adelay=12180|12180,volume=0.26[s1];\
[8:a]adelay=15080|15080,volume=0.30[w4];\
[9:a]adelay=15780|15780,volume=0.34[k1];\
[10:a]adelay=16550|16550,volume=0.36[k2];\
[11:a]adelay=17090|17090,volume=0.30[w5];\
${BGMIN}[w1][w2][w3][i1][c1][s1][w4][k1][k2][w5]amix=inputs=$N:duration=longest:dropout_transition=0,alimiter=limit=0.95,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -ar 48000 -t ${DUR} -movflags +faststart "$OUT"
echo "muxed -> $OUT"
