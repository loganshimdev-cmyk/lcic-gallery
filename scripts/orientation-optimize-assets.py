# -*- coding: utf-8 -*-
"""orientation/assets 사진·로고 최적화 — 8월본(orientation-aug)과 같은 설정.

    python scripts/orientation-optimize-assets.py            # 미리보기
    python scripts/orientation-optimize-assets.py --apply    # 실제 적용

사진: 최대 1920px · JPEG q82, 350KB 넘으면 1600px · q75 로 한 번 더
로고: 256px PNG (투명도 유지 — JPEG 로 바꾸면 안 된다)
이미 orientation-aug/assets 에 같은 경로의 최적화본이 있으면 그걸 복사한다.
폰트는 orientation-subset-fonts.py 가 따로 다룬다.

작업 폴더의 사진은 이미 줄여둔 상태다. 그걸 다시 줄이면 화질만 깎이므로,
폰트 쪽과 같이 **항상 git 의 최적화 직전 원본**(BASE_COMMIT)에서 작업한다.
그래서 몇 번을 돌려도 결과가 같다. BASE_COMMIT 에 없는(나중에 추가된) 사진만
현재 파일을 소스로 쓴다.

필요: pip install pillow
"""
import io, os, shutil, subprocess, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'orientation', 'assets')
AUG = os.path.join(ROOT, 'orientation-aug', 'assets')

MAXPX, Q = 1920, 82
SMALLER_OVER = 350 * 1024
MAXPX2, Q2 = 1600, 75

# 사진·폰트를 줄이기 직전 커밋. 여기에 원본 사진이 들어 있다.
BASE_COMMIT = 'abcdde8'

DRY = '--apply' not in sys.argv


def git_original(rel_from_root):
    """BASE_COMMIT 에 들어 있는 원본 파일 내용. 없으면 None."""
    try:
        return subprocess.run(
            ['git', 'show', '%s:%s' % (BASE_COMMIT, rel_from_root)],
            cwd=ROOT, check=True, capture_output=True).stdout
    except subprocess.CalledProcessError:
        return None


tot_before = tot_after = 0
n_copy = n_shrink = n_skip = 0
rows = []

for dirpath, _dirs, files in os.walk(SRC):
    for fn in files:
        p = os.path.join(dirpath, fn)
        ext = os.path.splitext(fn)[1].lower()
        if ext not in ('.jpg', '.jpeg', '.png'):
            continue
        rel = os.path.relpath(p, SRC).replace('\\', '/')
        cur = os.path.getsize(p)

        # 원본을 git 에서 꺼내 그걸 줄인다 (없으면 현재 파일)
        raw = git_original('orientation/assets/' + rel)
        before = len(raw) if raw is not None else cur
        tot_before += before

        augp = os.path.join(AUG, rel)
        # 8월본에 더 작은 사본이 이미 있으면 그대로 가져다 쓴다
        if os.path.exists(augp) and os.path.getsize(augp) < before:
            after = os.path.getsize(augp)
            if not DRY and after != cur:
                shutil.copy2(augp, p)
            n_copy += 1
            tot_after += after
            rows.append((before, after, rel, 'aug 복사'))
            continue

        try:
            im = Image.open(io.BytesIO(raw) if raw is not None else p)
        except Exception as e:
            print('  건너뜀(열기 실패):', rel, e)
            tot_after += before
            n_skip += 1
            continue

        is_logo = '/brand/' in ('/' + rel)
        has_alpha = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)

        if is_logo:
            # 로고는 투명도를 지켜야 하므로 PNG 로 두고 크기만 줄인다
            w, h = im.size
            if max(w, h) > 256:
                r = 256 / max(w, h)
                im = im.resize((max(1, round(w * r)), max(1, round(h * r))), Image.LANCZOS)
            buf = io.BytesIO()
            im.convert('RGBA').save(buf, 'PNG', optimize=True)
            data, newext = buf.getvalue(), '.png'
        else:
            w, h = im.size
            if max(w, h) > MAXPX:
                r = MAXPX / max(w, h)
                im = im.resize((round(w * r), round(h * r)), Image.LANCZOS)
            buf = io.BytesIO()
            bg = im
            if has_alpha:
                # 투명 배경은 흰색으로 깔고 JPEG 로 (사진에는 투명이 의미 없다)
                bg = Image.new('RGB', im.size, (255, 255, 255))
                bg.paste(im.convert('RGBA'), mask=im.convert('RGBA').split()[-1])
            bg.convert('RGB').save(buf, 'JPEG', quality=Q, optimize=True, progressive=True)
            data = buf.getvalue()
            if len(data) > SMALLER_OVER:
                im2 = bg
                w2, h2 = im2.size
                if max(w2, h2) > MAXPX2:
                    r = MAXPX2 / max(w2, h2)
                    im2 = im2.resize((round(w2 * r), round(h2 * r)), Image.LANCZOS)
                buf2 = io.BytesIO()
                im2.convert('RGB').save(buf2, 'JPEG', quality=Q2, optimize=True, progressive=True)
                if len(buf2.getvalue()) < len(data):
                    data = buf2.getvalue()
            newext = '.jpg'
        im.close()

        if len(data) >= before:
            tot_after += before
            n_skip += 1
            continue

        # 확장자가 바뀌어도 파일명은 그대로 둔다 — HTML 의 경로를 건드리지 않기 위해서다.
        # (브라우저는 Content-Type 으로 판단하고, GitHub Pages 는 .png 도 올바로 내려준다)
        if not DRY and data != open(p, 'rb').read():
            with open(p, 'wb') as f:
                f.write(data)
        tot_after += len(data)
        n_shrink += 1
        rows.append((before, len(data), rel, '%s %dpx' % (newext[1:], max(im.size) if im.size else 0)))

rows.sort(reverse=True)
print('--- 많이 줄어든 것 15개 ---')
for b, a, rel, how in rows[:15]:
    print('  %8.1f KB -> %7.1f KB  %-52s %s' % (b / 1024, a / 1024, rel.split('/')[-1][:52], how))
print()
print('%s  복사 %d · 축소 %d · 그대로 %d' % ('[미리보기]' if DRY else '[적용됨]', n_copy, n_shrink, n_skip))
print('합계: %.1f MB -> %.1f MB' % (tot_before / 1048576, tot_after / 1048576))
if DRY:
    print('\n실제로 바꾸려면 --apply 를 붙여 다시 실행하세요.')
