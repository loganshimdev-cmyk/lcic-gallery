# -*- coding: utf-8 -*-
"""오리엔테이션 덱 → 인터넷 없이 열리는 단일 HTML 파일.

    python scripts/orientation-build-offline.py orientation-dankook
    python scripts/orientation-build-offline.py orientation-oct --out "D:/어디/파일.html"

사진·로고·폰트를 전부 base64 로 본문에 넣어 외부 파일을 하나도 부르지 않게 만든다.
받는 사람은 파일 하나를 내려받아 더블클릭하면 된다.

- 사진·폰트는 이미 orientation-optimize-assets.py / orientation-subset-fonts.py 로
  줄여둔 것을 **그대로** 넣는다. 여기서 다시 압축하지 않는다(화질만 깎인다).
- 영상 2개(합 113MB)는 넣지 않고 안내 문구로 대체한다. mp4 는 같은 폴더에
  따로 올려서 쓴다.
- 비밀번호 게이트는 뺀다. 파일 자체를 건네주는 것이라 한 번 더 묻는 게 번거롭다.

기본 출력: ~/Downloads/LCIC-오리엔테이션-오프라인/<덱이름>.html
"""
import base64, os, re, sys, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

args = [a for a in sys.argv[1:] if not a.startswith('--')]
DECK = args[0] if args else 'orientation-dankook'
OUT = None
if '--out' in sys.argv:
    OUT = os.path.expanduser(sys.argv[sys.argv.index('--out') + 1])
TITLE = None
if '--title' in sys.argv:
    TITLE = sys.argv[sys.argv.index('--title') + 1]
if not OUT:
    OUT = os.path.join(os.path.expanduser('~'), 'Downloads',
                       'LCIC-오리엔테이션-오프라인', DECK + '.html')

SRC = os.path.join(ROOT, DECK, 'index.html')
if not os.path.exists(SRC):
    sys.exit('FAIL: %s 가 없습니다' % SRC)

s = open(SRC, encoding='utf-8').read()


def must(old, new, txt, label, count=1):
    n = txt.count(old)
    if n != count:
        sys.exit('FAIL [%s]: %d개 예상, %d개 발견\n%r' % (label, count, n, old[:120]))
    return txt.replace(old, new)


# --------------------------------------------------------------- 1. 비번 게이트 제거
m = re.search(r'\n*<div id="ot-gate"[\s\S]*?\n</div>\n', s)
if not m:
    sys.exit('FAIL: ot-gate 마크업을 못 찾음')
s = s[:m.start()] + '\n' + s[m.end():]

m = re.search(r'<script>\s*\(function\(\)\s*\{\s*var KEY="lcic-ot[\s\S]*?</script>\n?', s)
if not m:
    sys.exit('FAIL: ot-gate 스크립트를 못 찾음')
s = s[:m.start()] + s[m.end():]
s = re.sub(r'\.ot-locked[^{]*\{[^}]*\}', '', s)
# 지연 로딩 스크립트가 'ot-gate' 를 참조하지만 게이트가 없으면 바로 넘어가므로
# (if(!gate){ afterLayout(); return; }) 그대로 둔다. 마크업과 비번 로직만 확인한다.
assert '<div id="ot-gate"' not in s, '게이트 마크업 잔존'
assert 'var KEY="lcic-ot' not in s, '게이트 비번 로직 잔존'
assert 'ot-locked' not in s.replace("classList.remove('ot-locked')", ''), '게이트 잠금 잔존'

# --------------------------------------------------------------- 2. 영상 2개 대체
NOTE = ('<div style="width:100%;height:100%;display:flex;flex-direction:column;'
        'align-items:center;justify-content:center;gap:10px;background:#0f172a;'
        'color:rgba(255,255,255,0.72);text-align:center;padding:24px;">'
        '<div style="font-size:0.95rem;font-weight:700;color:#fff;">{title}</div>'
        '<div style="font-size:0.8rem;line-height:1.6;">이 파일에는 영상이 들어 있지 않습니다.<br/>'
        '같은 폴더의 <b>{file}</b> 파일을 열어 보세요.</div></div>')

for _vid, _title, _file in [
    ('lcic-promo', '학교 홍보 영상', 'lcic-promo.mp4'),
    ('mark_speech', '센터장 인사말 영상', 'mark_speech.mp4'),
]:
    mm = re.search(r'<video[^>]*>[\s\S]*?' + re.escape(_vid) + r'[\s\S]*?</video>', s)
    if not mm:
        sys.exit('FAIL: %s video 태그를 못 찾음' % _vid)
    s = s[:mm.start()] + NOTE.format(title=_title, file=_file) + s[mm.end():]

# 주석 속 '<video>' 라는 낱말이 있어 여는 태그만 좁혀서 확인한다.
assert '<source' not in s, '영상 source 잔존'
assert re.search(r'<video\s+(id|class)=', s) is None, '영상 태그 잔존'

# 인사말 슬라이드(s15)에 남는 재생 컨트롤·타임바·포스터는 동작할 대상이 없으므로 숨긴다.
# (제어 스크립트는 `if(!v) return;` 로 안전하게 빠져나간다)
s = must('</head>',
         '<style>\n'
         '  /* 오프라인본: 영상이 없으므로 플레이어 UI 를 숨긴다 */\n'
         '  #s15 .mark-controls, #s15 .mark-timebar, #s15 .mark-poster-play,\n'
         '  #s15 .mark-state-badge { display: none !important; }\n'
         '</style>\n</head>', s, 'hide-player')

# --------------------------------------------------------------- 3. 에셋 인라인
MIME = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'}
_cache = {}


def data_uri(abs_path):
    if abs_path in _cache:
        return _cache[abs_path]
    ext = os.path.splitext(abs_path)[1].lower()
    raw = open(abs_path, 'rb').read()
    uri = 'data:%s;base64,%s' % (MIME.get(ext, 'application/octet-stream'),
                                 base64.b64encode(raw).decode())
    _cache[abs_path] = uri
    return uri


def resolve(ref):
    """HTML 안의 상대 경로를 실제 파일 경로로."""
    rel = urllib.parse.unquote(ref)
    p = os.path.normpath(os.path.join(ROOT, DECK, rel))
    return p if os.path.exists(p) else None


# 3-1. 폰트 CSS 를 읽어 woff2 를 data URI 로 바꾼 뒤 <style> 로 인라인
font_css = ''
font_links = re.findall(r'<link rel="stylesheet" href="([^"]+)">', s)
for href in font_links:
    p = resolve(href)
    if not p:
        sys.exit('FAIL: 폰트 CSS 를 못 찾음 %s' % href)
    css = open(p, encoding='utf-8').read()
    d = os.path.dirname(p)

    def rep(mm):
        fp = os.path.join(d, urllib.parse.unquote(mm.group(1)))
        if not os.path.exists(fp):
            sys.exit('FAIL: 폰트 파일 없음 %s' % fp)
        return 'url(%s)' % data_uri(fp)

    font_css += re.sub(r'url\(([^)]+\.woff2)\)', rep, css) + '\n'

for href in font_links:
    s = s.replace('<link rel="stylesheet" href="%s">\n' % href, '')
    s = s.replace('<link rel="stylesheet" href="%s">' % href, '')
s = must('</head>', '<style>\n' + font_css + '</style>\n</head>', s, 'font-inline')
print('폰트 인라인: %d개 CSS · %.2f MB' % (len(font_links), len(font_css.encode()) / 1048576))

# 3-2. 나머지 이미지 (background-image / src / href)
refs = set()
# 파일명에 괄호가 든 사진이 있다(Class(2023)_4.jpg). url() 안을 괄호로 끊으면
# 경로가 잘리므로, 따옴표로 감싼 경우를 먼저 따옴표 기준으로 읽는다.
for mm in re.finditer(r'''url\(\s*(['"])(.*?)\1\s*\)''', s):
    if 'assets/' in mm.group(2):
        refs.add(mm.group(2))
for mm in re.finditer(r'''url\(\s*([^'"()\s][^()]*?)\s*\)''', s):
    if 'assets/' in mm.group(1):
        refs.add(mm.group(1))
for mm in re.finditer(r'(?:src|href)=(["\'])([^"\']*assets/[^"\']+)\1', s):
    refs.add(mm.group(2))

n_img = 0
# 긴 경로부터 바꿔야 짧은 경로가 다른 경로의 앞부분을 먹지 않는다
for ref in sorted(refs, key=len, reverse=True):
    p = resolve(ref)
    if not p:
        sys.exit('FAIL: 파일 없음 %s' % ref)
    s = s.replace(ref, data_uri(p))
    n_img += 1
print('이미지 인라인: %d개' % n_img)

# --------------------------------------------------------------- 4. 검증
left = re.findall(r'(?:src|href)=["\'](?!data:|#|https?://|mailto:)[^"\']+["\']', s)
left = [x for x in left if 'w3.org' not in x]
if left:
    sys.exit('FAIL: 외부 참조 잔존 %r' % left[:5])
assert 'assets/' not in s, '남은 assets 경로 있음'

if TITLE:
    s = re.sub(r'<title>[^<]*</title>', lambda _m: '<title>%s</title>' % TITLE, s, count=1)
m = re.search(r'<title>([^<]*)</title>', s)
print('제목:', m.group(1) if m else '(없음)')

os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w', encoding='utf-8').write(s)
print('\n완성: %s  (%.1f MB)' % (OUT, os.path.getsize(OUT) / 1048576))
