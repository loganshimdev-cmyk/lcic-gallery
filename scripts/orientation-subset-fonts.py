# -*- coding: utf-8 -*-
"""orientation/assets/fonts 를 덱에 쓰인 글자만 남겨 서브셋한다.

    python scripts/orientation-subset-fonts.py            # 미리보기
    python scripts/orientation-subset-fonts.py --apply    # 실제 적용

이 폰트 폴더는 orientation / orientation2 / orientation3 / orientation-oct /
orientation-dankook 다섯 덱이 함께 쓴다. 그래서 한 덱이 아니라 다섯 덱 글자의
합집합으로 서브셋한다.

중요 — 덱 문구를 고쳤으면 이 스크립트를 다시 돌릴 것.
서브셋에 없는 글자는 시스템 한글 폰트로 대체되어 글꼴만 달라진다(깨지지는 않는다).

작업 폴더의 폰트는 이미 서브셋된 상태라, 그걸 다시 서브셋하면 글자를 되살릴 수
없다. 그래서 항상 git 에 남아 있는 **최적화 직전 원본**(BASE_COMMIT)을 꺼내서
거기서 서브셋한다. 원본 7MB 를 작업 폴더에 중복 보관하지 않으려는 것이다.

필요: pip install fonttools brotli pillow
"""
import io, os, re, subprocess, sys, unicodedata

from fontTools.subset import Subsetter, Options
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS_REL = 'orientation/assets/fonts'
FONTS = os.path.join(ROOT, FONTS_REL)
DECKS = ['orientation', 'orientation2', 'orientation3', 'orientation-oct', 'orientation-dankook']

# 사진·폰트를 줄이기 직전 커밋. 여기에 원본 woff2 가 들어 있다.
BASE_COMMIT = 'abcdde8'

DRY = '--apply' not in sys.argv


def git_original(rel_path):
    """BASE_COMMIT 에 들어 있는 원본 파일 내용을 돌려준다. 없으면 None."""
    try:
        return subprocess.run(
            ['git', 'show', '%s:%s' % (BASE_COMMIT, rel_path)],
            cwd=ROOT, check=True, capture_output=True).stdout
    except subprocess.CalledProcessError:
        return None


# ---- 1. 다섯 덱에 실제로 쓰인 글자 모으기 ----------------------------------
chars = set()
for d in DECKS:
    f = os.path.join(ROOT, d, 'index.html')
    if not os.path.exists(f):
        continue
    s = open(f, encoding='utf-8').read()
    t = re.sub(r'<(script|style)[\s\S]*?</\1>', ' ', s)
    t = re.sub(r'<[^>]+>', ' ', t)
    chars |= set(t)
print('덱에서 모은 글자:', len(chars))

# ---- 2. 여유분: 아스키 · 한글 자모 · 자주 쓰는 기호 --------------------------
for c in range(0x20, 0x7F):
    chars.add(chr(c))
for c in range(0x3131, 0x3164):
    chars.add(chr(c))
chars |= set('―—–·…‘’“”′″€£¥₩₱©®™°±×÷≤≥≠→←↑↓☆★◆◇■□●○▲▼ⅠⅡⅢⅣⅤ')

chars = {c for c in chars if c.isprintable() and not unicodedata.combining(c)}
print('서브셋 글자 수:', len(chars))
text = ''.join(sorted(chars))


def subset(raw, chars_text):
    f = TTFont(io.BytesIO(raw))
    opts = Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.notdef_outline = True
    opts.drop_tables += ['DSIG']
    sub = Subsetter(options=opts)
    sub.populate(text=chars_text)
    sub.subset(f)
    buf = io.BytesIO()
    f.flavor = 'woff2'
    f.save(buf)
    f.close()
    return buf.getvalue()


tb = ta = 0
for dirpath, _d, files in os.walk(FONTS):
    for fn in sorted(files):
        if not fn.lower().endswith('.woff2'):
            continue
        p = os.path.join(dirpath, fn)
        rel = os.path.relpath(p, ROOT).replace('\\', '/')

        raw = git_original(rel)
        src = '원본(%s)' % BASE_COMMIT
        if raw is None:
            raw = open(p, 'rb').read()
            src = '현재 파일'
        tb += len(raw)

        try:
            data = subset(raw, text)
        except Exception as e:
            print('  건너뜀:', fn, e)
            ta += len(raw)
            continue

        if not DRY:
            with open(p, 'wb') as f:
                f.write(data)
        ta += len(data)
        print('  %-34s %7.1f KB -> %6.1f KB  %s' % (fn, len(raw) / 1024, len(data) / 1024, src))

print()
print('%s  폰트 합계: %.2f MB -> %.2f MB' % ('[미리보기]' if DRY else '[적용됨]', tb / 1048576, ta / 1048576))
if DRY:
    print('실제로 바꾸려면 --apply 를 붙이세요.')
