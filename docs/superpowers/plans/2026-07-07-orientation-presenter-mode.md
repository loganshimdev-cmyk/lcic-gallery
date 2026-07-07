# 오리엔테이션 발표자 모드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `orientation-aug` 덱에 발표자 콘솔(`present.html`)과 관객 창(`?screen`)을 추가해, 발표자가 슬라이드를 넘기면 미트/줌에 공유 중인 관객 창이 대본과 함께 동시에 넘어가게 한다.

**Architecture:** 기존 `index.html`은 불변 유지하고 `?screen` 파라미터일 때만 활성화되는 동기화 에이전트(게이트/크롬/자체네비 off + postMessage 수신)를 덧붙인다. 새 `present.html`은 현재/다음 슬라이드를 `index.html?screen` iframe으로 라이브 렌더하고, 대본·타이머·컨트롤을 붙이며, `window.open`으로 띄운 관객 창과 iframe들에 `postMessage`로 인덱스를 브로드캐스트한다.

**Tech Stack:** 순수 HTML/CSS/JS (의존성 없음), `window.postMessage`, Playwright(검증)

---

## File Structure

- `orientation-aug/index.html` — 수정: 파일 끝 IIFE 뒤에 `?screen` 동기화 에이전트 추가 (기존 코드 불변)
- `orientation-aug/present.html` — 신규: 발표자 콘솔 (게이트 + 레이아웃 + 동기화 + SCRIPTS 배열)
- `scratchpad/present_verify.py` — Playwright 검증 스크립트 (임시)

---

### Task 1: `index.html`에 `?screen` 동기화 에이전트 추가

**Files:**
- Modify: `orientation-aug/index.html` (마지막 `</script>` 직전, `update();` 호출부가 있는 IIFE 내부 끝)

기존 IIFE는 `go(i)`, `cur`, `slides`, keydown/wheel/touch 핸들러를 가진다. 이 IIFE **안**, `update();` 바로 앞에 아래 블록을 삽입한다. `SCREEN` 플래그로 분기하며, 기본 모드에선 아무 것도 안 한다.

- [ ] **Step 1: `?screen` 감지 + 크롬/게이트/네비 제어 삽입**

`update();` 앞에 삽입:

```javascript
  // ===== Presenter sync (activates only with ?screen) =====
  var SCREEN = /[?&]screen\b/.test(location.search);
  if (SCREEN) {
    document.documentElement.setAttribute('data-screen','1');
    // 게이트 제거 (발표자가 로컬에서 여는 창)
    var g = document.getElementById('ot-gate');
    if (g) g.remove();
    document.body.classList.remove('ot-locked');
    // 크롬 숨김
    ['progress','nav-dots','slide-counter'].forEach(function(id){
      var el = document.getElementById(id); if (el) el.style.display = 'none';
    });
    // 자체 네비 무력화: go()만 유효, 입력 이벤트는 무시
    window.addEventListener('keydown', function(e){ e.stopImmediatePropagation(); }, true);
    window.addEventListener('wheel', function(e){ e.stopImmediatePropagation(); }, true);
    // 발표자 콘솔의 지시 수신
    window.addEventListener('message', function(e){
      var d = e.data;
      if (!d || d.source !== 'lcic-ot' || d.action !== 'goto') return;
      var i = d.index|0;
      if (i < 0) i = 0; if (i >= TOTAL) i = TOTAL - 1;
      slides[i].scrollIntoView({ behavior: 'auto' });
      cur = i;
    });
    // 준비 완료 신호
    try { (window.opener||window.parent) && (window.opener||window.parent).postMessage({source:'lcic-ot-screen',action:'ready'},'*'); } catch(_){}
  }
```

주의: 위 keydown/wheel 캡처 리스너는 기존 핸들러보다 먼저(capture=true) 잡아 전파를 끊는다. 기존 핸들러 코드는 그대로 두되 `?screen`에서만 무력화된다.

- [ ] **Step 2: 기본 모드 회귀 확인 (수동)**

`orientation-aug/index.html`을 파라미터 없이 로컬 서버로 열어 게이트(0803)·네비·카운터가 그대로인지 확인. `?screen`으로 열면 게이트/점/카운터가 사라지는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add orientation-aug/index.html
git commit -m "feat(orientation-aug): ?screen 관객 모드 동기화 에이전트 추가"
```

---

### Task 2: `present.html` 골격 (게이트 + 레이아웃 + iframe)

**Files:**
- Create: `orientation-aug/present.html`

- [ ] **Step 1: 게이트 + 레이아웃 + 두 iframe + 대본/타이머/컨트롤 마크업 작성**

전체 파일을 작성한다(아래 Task 3~5에서 스크립트·SCRIPTS를 채운다). 헤더(타이머, 카운터, 관객창 버튼), 메인(현재 iframe `index.html?screen`), 사이드(다음 iframe + 대본), 푸터(이전/다음). iframe은 1280×720 렌더 후 `transform:scale`로 패널에 맞춘다. 게이트는 `index.html` 패턴 복제, PW `0803`, KEY `lcic-ot-present-v1`.

- [ ] **Step 2: 로컬에서 열어 레이아웃·게이트 확인 (수동)**

`present.html`을 0803으로 해제 → 좌측에 슬라이드1, 우측에 다음/대본 패널이 보이는지, 오버플로 없는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add orientation-aug/present.html
git commit -m "feat(orientation-aug): 발표자 콘솔 present.html 골격"
```

---

### Task 3: 동기화·컨트롤 로직

**Files:**
- Modify: `orientation-aug/present.html` (스크립트부)

- [ ] **Step 1: `cur` 상태 + broadcast + 컨트롤 + 키보드 구현**

```javascript
var TOTAL = 31;
var cur = 0;
var audienceWin = null;
var curFrame = document.getElementById('cur-frame');   // index.html?screen
var nextFrame = document.getElementById('next-frame');  // index.html?screen
var framesReady = { cur:false, next:false };

function send(win, index){
  if (!win) return;
  try { win.postMessage({source:'lcic-ot', action:'goto', index:index}, '*'); } catch(_){}
}
function broadcast(){
  send(curFrame.contentWindow, cur);
  send(nextFrame.contentWindow, Math.min(cur+1, TOTAL-1));
  if (audienceWin && !audienceWin.closed) send(audienceWin, cur);
}
function render(){
  document.getElementById('counter').textContent = (cur+1) + ' / ' + TOTAL;
  document.getElementById('script').innerHTML = SCRIPTS[cur] || '<em>(대본 없음)</em>';
  document.getElementById('next-label').textContent =
    cur+1 < TOTAL ? ('다음 · ' + (cur+2)) : '끝';
  document.querySelectorAll('.dot').forEach(function(d,i){ d.classList.toggle('on', i===cur); });
}
function goto(i){
  cur = Math.max(0, Math.min(TOTAL-1, i));
  broadcast(); render();
}
document.getElementById('prev').addEventListener('click', function(){ goto(cur-1); });
document.getElementById('next').addEventListener('click', function(){ goto(cur+1); });
window.addEventListener('keydown', function(e){
  var t=(e.target.tagName||'').toUpperCase();
  if (t==='INPUT'||t==='TEXTAREA') return;
  switch(e.key){
    case 'ArrowRight': case ' ': case 'PageDown': e.preventDefault(); goto(cur+1); break;
    case 'ArrowLeft': case 'PageUp': e.preventDefault(); goto(cur-1); break;
    case 'Home': e.preventDefault(); goto(0); break;
    case 'End': e.preventDefault(); goto(TOTAL-1); break;
  }
});
// iframe 로드되면 현재 인덱스 동기화
curFrame.addEventListener('load', function(){ framesReady.cur=true; send(curFrame.contentWindow, cur); });
nextFrame.addEventListener('load', function(){ framesReady.next=true; send(nextFrame.contentWindow, Math.min(cur+1,TOTAL-1)); });
```

- [ ] **Step 2: 관객 창 열기 버튼 + 타이머 구현**

```javascript
document.getElementById('open-aud').addEventListener('click', function(){
  if (audienceWin && !audienceWin.closed) { audienceWin.focus(); return; }
  audienceWin = window.open('index.html?screen', 'lcic-audience', 'width=1280,height=720');
  // 관객 창 로드 후 현재 인덱스 전송 (ready 메시지 수신 시)
});
window.addEventListener('message', function(e){
  if (e.data && e.data.source==='lcic-ot-screen' && e.data.action==='ready') send(audienceWin, cur);
});
// 타이머
var t0=null, tik=null;
function fmt(s){ var m=Math.floor(s/60); s=s%60; return (m<10?'0':'')+m+':'+(s<10?'0':'')+s; }
function startTimer(){ if(tik) return; t0 = t0 || Date.now(); tik=setInterval(function(){
  document.getElementById('timer').textContent = fmt(Math.floor((Date.now()-t0)/1000)); },250); }
function pauseTimer(){ clearInterval(tik); tik=null; }
function resetTimer(){ pauseTimer(); t0=null; document.getElementById('timer').textContent='00:00'; }
document.getElementById('t-start').addEventListener('click', startTimer);
document.getElementById('t-pause').addEventListener('click', pauseTimer);
document.getElementById('t-reset').addEventListener('click', resetTimer);
render();
```

- [ ] **Step 3: 커밋**

```bash
git add orientation-aug/present.html
git commit -m "feat(orientation-aug): 발표자 콘솔 동기화·타이머·컨트롤"
```

---

### Task 4: 31장 대본 작성

**Files:**
- Modify: `orientation-aug/present.html` (`SCRIPTS` 배열)

- [ ] **Step 1: 슬라이드 실제 내용 재확인**

`orientation-aug/index.html`의 31개 `<section class="slide" ... data-slide="N">`를 순서대로 훑어 각 장 핵심을 정리.

- [ ] **Step 2: `SCRIPTS` 배열(31개) 작성**

각 원소는 HTML 문자열(문단 `<p>`/강조 `<b>` 허용). LCIC 사실 근거(ONE-EFL 4주·대학생·그룹수업·통금 22시·출석 70%·4주 일정·기숙사·문화체험). 경쟁사 비방 금지, 추정 단정 금지(1차 자료 범위). 예:

```javascript
var SCRIPTS = [
  "<p>안녕하세요, LCIC 신입생 오리엔테이션을 시작하겠습니다. 오늘은 출국 전 꼭 알아야 할 내용을 함께 살펴봅니다.</p>",
  /* ... 31개 ... */
];
```

- [ ] **Step 3: 커밋**

```bash
git add orientation-aug/present.html
git commit -m "content(orientation-aug): 발표 대본 31장 초안"
```

---

### Task 5: Playwright 검증

**Files:**
- Create: `scratchpad/present_verify.py`

- [ ] **Step 1: 검증 스크립트 작성·실행**

로컬 서버(`python -m http.server`) 후: (a) `present.html` 0803 해제, (b) next 버튼 클릭 시 `#counter`가 `2 / 31`로, 대본 패널 텍스트 변경, (c) `#cur-frame`/`#next-frame` 내부 `.slide.visible` 또는 스크롤 위치가 각각 cur/cur+1로 이동, (d) 콘솔 레이아웃 스크롤 오버플로 없음, (e) 기본 모드 `index.html`(파라미터 없음)에서 게이트 존재 회귀.

- [ ] **Step 2: 통과 확인 후 정리**

검증 통과하면 스크린샷 확인, 임시 스크립트는 남겨두거나 삭제.

---

### Task 6: 배포

- [ ] **Step 1: 최종 로컬 확인 후 푸시**

```bash
git push origin main
```

- [ ] **Step 2: 배포 URL 안내**

`lcic-campus.com/orientation-aug/present.html` (발표자), `?screen` (관객).

---

## Self-Review

- **Spec coverage:** ?screen 에이전트(Task1)=스펙 아키텍처1, present.html(Task2-3)=아키텍처2, postMessage 동기화(Task3), 대본(Task4)=콘텐츠, 검증(Task5)=검증, 배포(Task6). 스펙 결정사항(콘솔만 0803, 커버명 유지) 반영됨.
- **Placeholder scan:** SCRIPTS 실제 문장은 Task4에서 작성(계획엔 형식·근거 명시). 코드 스텝은 실제 코드 포함.
- **Type consistency:** `send/broadcast/goto/render`, id(`cur-frame`,`next-frame`,`counter`,`script`,`prev`,`next`,`open-aud`,`timer`,`t-start/pause/reset`,`next-label`,`dot`) Task2 마크업과 Task3 스크립트에서 동일하게 사용.
