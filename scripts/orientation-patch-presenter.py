# -*- coding: utf-8 -*-
"""오리엔테이션 덱에 발표자 콘솔 수신부(`?screen` 모드)를 넣는다.

    python scripts/orientation-patch-presenter.py orientation-dankook
    python scripts/orientation-patch-presenter.py orientation-oct orientation-dankook

8월본(orientation-aug)에서 검증된 코드를 그대로 옮긴다. 덱을 `?screen` 으로 열면
비번 게이트·진행바·쪽번호가 사라지고, 발표자 콘솔이 보내는 goto/video 지시만 듣는다
(관객 창에서 사용자가 키보드나 스크롤로 멋대로 넘기지 못하게 자체 네비는 막는다).

8월본과 다른 점 하나: 발표 중 흰 화면이 번쩍이지 않게 `?screen` 에서는 배경 지연
로딩(lazybg)을 끈다. 로컬 파일로 여는 창이라 사진 14MB를 한 번에 읽어도 괜찮다.

몇 번 돌려도 결과가 같다 — 이미 들어 있으면 건너뛴다.
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECKS = [a for a in sys.argv[1:] if not a.startswith('--')] or ['orientation-dankook']

BLOCK = '''
  // ===== Presenter sync (activates only with ?screen) =====
  var SCREEN = /[?&]screen\\b/.test(location.search);
  if (SCREEN) {
    document.documentElement.setAttribute('data-screen','1');
    // 즉시 이동 (CSS scroll-behavior:smooth 무시 → 발표 중 애니메이션 없이 딱딱 넘김)
    document.documentElement.style.scrollBehavior = 'auto';
    // 게이트 제거 (발표자가 로컬에서 여는 창)
    var g = document.getElementById('ot-gate');
    if (g) g.remove();
    document.body.classList.remove('ot-locked');
    // 배경 지연 로딩 해제 — 넘길 때 흰 화면이 번쩍이지 않게 한다
    document.documentElement.classList.remove('lazybg');
    document.querySelectorAll('section.slide').forEach(function(s){ s.classList.add('bg-on'); });
    // 크롬 숨김
    ['progress','nav-dots','slide-counter'].forEach(function(id){
      var el = document.getElementById(id); if (el) el.style.display = 'none';
    });
    // 발표용 커버 발표자명 교체 (학생용 기본 모드는 그대로 유지)
    document.querySelectorAll('.meta-row .col').forEach(function(col){
      var lbl = col.querySelector('.lbl'), val = col.querySelector('.val');
      if (lbl && val && /Presenter/i.test(lbl.textContent)) val.textContent = 'Miguel Shim · 심상현 매니저';
    });
    // 즉시 표시: 리빌 애니메이션(.r opacity:0)을 기다리지 않고 바로 그림
    // (라이브에서 이미지·영상 로딩으로 observer가 늦으면 흰 화면 되는 문제 방지)
    var scst = document.createElement('style');
    scst.textContent = '.r{opacity:1 !important; transform:none !important; filter:none !important; animation:none !important;}';
    document.head.appendChild(scst);
    slides.forEach(function(s){ s.classList.add('visible'); });
    // 무거운 영상은 초기 프리로드 끔 (해당 슬라이드 도달 시 로드) → 창 열림 속도 개선
    // preview 모드(발표자 콘솔 미리보기 iframe)는 영상 음소거 강제 → 관객 창 소리와 겹침 원천 차단
    var PREVIEW = /[?&]preview\\b/.test(location.search);
    document.querySelectorAll('video').forEach(function(v){
      try {
        v.preload = 'none';
        if (PREVIEW) { v.muted = true; v.volume = 0; v.addEventListener('volumechange', function(){ if(!v.muted){ v.muted = true; } }); }
      } catch(_){}
    });
    // 자체 네비 무력화: 발표자 콘솔의 지시(goto)만 유효, 사용자 입력은 무시
    window.addEventListener('keydown', function(e){ e.stopImmediatePropagation(); }, true);
    window.addEventListener('wheel', function(e){ e.stopImmediatePropagation(); }, true);
    // 발표자 콘솔의 지시 수신
    window.addEventListener('message', function(e){
      var d = e.data;
      if (!d || d.source !== 'lcic-ot') return;
      if (d.action === 'goto') {
        var i = d.index|0;
        if (i < 0) i = 0; if (i >= TOTAL) i = TOTAL - 1;
        slides[i].scrollIntoView({ behavior: 'instant', block: 'start' });
        cur = i;
      } else if (d.action === 'video') {
        var v = slides[cur] && slides[cur].querySelector('video');
        if (!v) return;
        if (!PREVIEW) { v.muted = false; v.volume = 1; }   // 관객 창만 소리 켬 (미리보기는 계속 음소거)
        if (d.cmd === 'play')       { v.play().catch(function(){}); }
        else if (d.cmd === 'pause') { v.pause(); }
        else if (d.cmd === 'restart'){ try{ v.currentTime = 0; }catch(_){}; v.play().catch(function(){}); }
        else if (d.cmd === 'toggle'){ if (v.paused || v.ended) v.play().catch(function(){}); else v.pause(); }
      }
    });
    // 준비 완료 신호 (관객 창이 열린 뒤 콘솔이 현재 인덱스를 재전송하도록)
    try {
      var host = window.opener || window.parent;
      if (host && host !== window) host.postMessage({source:'lcic-ot-screen', action:'ready'}, '*');
    } catch(_){}
  }

'''

ANCHOR = '\n  update();\n})();\n'


def patch(deck):
    p = os.path.join(ROOT, deck, 'index.html')
    if not os.path.exists(p):
        return '(덱 없음)'
    s = open(p, encoding='utf-8').read()
    if 'var SCREEN' in s:
        return '이미 들어 있음'

    # 네비 IIFE 가 쓰는 이름들이 있어야 블록이 동작한다
    for name in ('const slides', 'const TOTAL', 'let cur'):
        if name not in s:
            return 'FAIL: %r 를 못 찾음 — 덱 구조가 다릅니다' % name

    n = s.count(ANCHOR)
    if n != 1:
        return 'FAIL: 삽입 위치(update();)를 %d개 발견 — 1개여야 합니다' % n

    s = s.replace(ANCHOR, BLOCK + ANCHOR)
    open(p, 'w', encoding='utf-8').write(s)
    return '수신부 추가 (%d줄)' % BLOCK.count('\n')


for d in DECKS:
    print('%-22s %s' % (d, patch(d)))
