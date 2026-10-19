# -*- coding: utf-8 -*-
"""오리엔테이션 덱에 영상 preload=none + 배경/이미지 지연 로딩을 적용한다.

지연 로딩 코드는 8월 학생본(aug2)에서 검증된 것을 그대로 쓴다.
- 배경 이미지: 첫 슬라이드만 바로, 나머지는 IntersectionObserver(300px 여유)
- <img>: loading="lazy" (비번 게이트 안의 로고는 제외 — 첫 화면에 바로 보여야 한다)
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECKS = sys.argv[1:] or ['orientation', 'orientation2', 'orientation3',
                         'orientation-oct', 'orientation-dankook', 'orientation-aug']

LAZY_CSS = '''<style id="lazybg-css">
  html.lazybg section.slide:not(.bg-on),
  html.lazybg section.slide:not(.bg-on) * { background-image: none !important; }
</style>
'''

LAZY_JS = '''
<script>
(function(){
  var docEl = document.documentElement;
  function showAll(){
    [].forEach.call(document.querySelectorAll('section.slide'), function(s){ s.classList.add('bg-on'); });
  }
  if(!('IntersectionObserver' in window)){ showAll(); return; }

  function init(){
    var slides = [].slice.call(document.querySelectorAll('section.slide'));
    if(!slides.length){ docEl.classList.remove('lazybg'); return; }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add('bg-on'); io.unobserve(e.target); }
      });
    }, { rootMargin: '300px 0px' });
    slides.forEach(function(s, i){
      if(i < 1){ s.classList.add('bg-on'); } else { io.observe(s); }
    });
    // 안전장치: 무슨 이유로든 관찰이 안 되면 12초 뒤 전부 표시
    setTimeout(function(){
      if(document.querySelectorAll('section.slide.bg-on').length < 3) showAll();
    }, 12000);
  }

  function afterLayout(){ requestAnimationFrame(function(){ requestAnimationFrame(init); }); }

  function start(){
    // 비번 게이트가 열린 뒤에 시작해야 화면 밖 슬라이드가 한꺼번에 잡히지 않는다
    var gate = document.getElementById('ot-gate');
    if(!gate){ afterLayout(); return; }
    var mo = new MutationObserver(function(){
      if(!document.getElementById('ot-gate')){ mo.disconnect(); afterLayout(); }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  // load 를 기다리면 폰트·사진이 느린 회선에서 수십 초 뒤에야 시작된다. DOM 이면 충분.
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
</script>
'''


def patch(path):
    s = open(path, encoding='utf-8').read()
    orig = s
    notes = []

    # 1) 영상은 눌렀을 때만 받는다
    n = s.count('preload="metadata"')
    if n:
        s = s.replace('preload="metadata"', 'preload="none"')
        notes.append('preload none ×%d' % n)

    # 2) <html> 에 lazybg
    m = re.search(r'<html([^>]*)>', s)
    if 'lazybg' not in m.group(0):
        attrs = m.group(1)
        if 'class="' in attrs:
            new = re.sub(r'class="([^"]*)"', lambda mm: 'class="%s lazybg"' % mm.group(1), attrs, count=1)
        else:
            new = attrs + ' class="lazybg"'
        s = s[:m.start()] + '<html%s>' % new + s[m.end():]
        notes.append('html.lazybg')

    # 3) head 끝에 CSS
    if 'lazybg-css' not in s:
        i = s.index('</head>')
        s = s[:i] + LAZY_CSS + s[i:]
        notes.append('lazybg css')

    # 4) body 끝에 스크립트
    if 'bg-on' not in s.split('</head>')[1] or 'rootMargin' not in s:
        i = s.rindex('</body>')
        s = s[:i] + LAZY_JS + '\n' + s[i:]
        notes.append('lazybg js')

    # 5) <img> 지연 로딩 — 게이트 안 로고는 제외
    gate_m = re.search(r'<div id="ot-gate"[\s\S]*?\n</div>\n', s)
    gate_span = (gate_m.start(), gate_m.end()) if gate_m else (-1, -1)
    added = 0
    out, last = [], 0
    for mm in re.finditer(r'<img\s(?![^>]*loading=)', s):
        if gate_span[0] <= mm.start() < gate_span[1]:
            continue
        out.append(s[last:mm.end()]); out.append('loading="lazy" decoding="async" ')
        last = mm.end(); added += 1
    if added:
        out.append(s[last:]); s = ''.join(out)
        notes.append('img lazy ×%d' % added)

    if s == orig:
        return '변경 없음'
    open(path, 'w', encoding='utf-8').write(s)
    return ' · '.join(notes)


for d in DECKS:
    p = os.path.join(ROOT, d, 'index.html')
    if not os.path.exists(p):
        print('%-22s (없음)' % d); continue
    print('%-22s %s' % (d, patch(p)))
