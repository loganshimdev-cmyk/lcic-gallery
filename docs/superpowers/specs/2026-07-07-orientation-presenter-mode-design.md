# 오리엔테이션 발표자 모드 (orientation-aug Presenter Mode)

작성일: 2026-07-07
대상: `orientation-aug` (LCIC 신입생 오리엔테이션, 31슬라이드 HTML 덱)

## 목적

발표자가 구글 미트/줌에서 **관객 창 하나만 화면 공유**하고, 발표자 본인 화면에서는 **대본 + 현재/다음 슬라이드 + 컨트롤**을 보며 진행한다. 발표자가 슬라이드를 넘기면 공유 중인 관객 창도 **동시에** 넘어간다.

핵심 제약: **기존 학생용 자료(`index.html` 기본 모드)는 절대 변경하지 않는다.** 학생이 보는 화면·동작·비밀번호는 그대로다.

## 구성 (3역할)

| 역할 | URL | 설명 |
|---|---|---|
| 학생용(기존) | `orientation-aug/` | 현행 유지. 비번 게이트(0803) + 전체 네비게이션 |
| 관객 창 | `orientation-aug/?screen` | 미트/줌에 공유할 깨끗한 슬라이드. 자체 조작 불가, 네비 UI·게이트 숨김 |
| 발표자 콘솔 | `orientation-aug/present.html` | 발표자 전용. 대본 + 현재/다음 미리보기 + 타이머 + 이전/다음. 비번 0803 |

## 아키텍처

### 1. `index.html` — `?screen` 동기화 에이전트 추가 (기존 동작 불변)

기존 네비게이션(IIFE, `go(i)`/`cur`) 끝에 작은 모듈을 덧붙인다. URL에 `?screen`이 있을 때만 활성화:

- 비밀번호 게이트 **건너뜀** (발표자가 로컬에서 여는 창)
- 크롬 숨김: `#progress`, `#nav-dots`, `#slide-counter`
- **자체 네비 비활성화**: keydown/wheel/touch/dot-click 무시 → 발표자만 제어
- `message` 리스너: `{source:'lcic-ot', action:'goto', index:i}` 수신 → `go(i)` 호출
- 파라미터 없으면(기본 모드) 위 로직 전부 미적용 → 학생용 100% 동일

### 2. `present.html` — 발표자 콘솔 (신규)

- 비밀번호 게이트: 기존과 동일 패턴, PW `0803`
- 레이아웃
  - 헤더: 경과 타이머(시작/일시정지/리셋), `현재 N / 31`, **[관객 창 열기]** 버튼
  - 메인: 현재 슬라이드 라이브 미리보기 = `<iframe src="index.html?screen">` (transform:scale로 패널에 맞춤)
  - 사이드바: 다음 슬라이드 미리보기(`<iframe src="index.html?screen">`, 인덱스 cur+1) + **대본 패널**(현재 슬라이드 대본, 스크롤)
  - 푸터: ◀ 이전 / 진행 점 / 다음 ▶
- 상태: `cur`(0-based). 변경 시 아래로 `postMessage({source:'lcic-ot', action:'goto', index})` 전송
  - 관객 창(window.open 핸들, 열려 있으면) → `cur`
  - 현재 미리보기 iframe → `cur`
  - 다음 미리보기 iframe → `cur+1` (마지막 장이면 빈 상태 표시)
  - 대본 패널·카운터 갱신
- 키보드: →/Space/PageDown = 다음, ←/PageUp = 이전, Home/End = 처음/끝
- [관객 창 열기]: `window.open('index.html?screen', 'lcic-audience', 'width=1280,height=720')` → 핸들 저장 → 로드 후 현재 인덱스 전송. 이미 열려 있으면 포커스
- 대본: `SCRIPTS` 배열(31개, 슬라이드 DOM 순서와 1:1). `present.html` 내부에만 존재 → 학생·관객에 미노출

### 동기화 메커니즘

같은 브라우저 내 창/iframe 간 **`window.postMessage`** 직접 전송(서버·인터넷 불필요, 즉시 반영). 수신측은 `event.data.source === 'lcic-ot'` 검증. BroadcastChannel 대신 직접 postMessage를 쓰는 이유: 콘솔이 모든 대상 핸들(iframe 2개 + 관객 window)을 소유하므로 가장 단순·확실.

## 슬라이드 인덱싱

`index.html`의 `document.querySelectorAll('.slide')` DOM 순서(0~30)를 단일 기준으로 삼는다. `SCRIPTS[i]`는 같은 순서. 카운터 표기는 `i+1 / 31`.

## 엣지 케이스

- 관객 창 닫힘 → 버튼으로 재오픈, 로드 후 현재 인덱스 재전송
- iframe 로드 전 goto 수신 → iframe `onload`까지 대기 후 마지막 인덱스 전송
- 범위 밖 이동 → 0~30 클램프
- 마지막 슬라이드에서 "다음 미리보기"는 "끝" 표시

## 대본 (콘텐츠)

31장 각각 한국어 발표 대본 초안을 작성한다. 각 슬라이드 실제 내용 + LCIC 사실(ONE-EFL 4주, 대학생, 그룹수업, 통금 22시, 출석 70%, 4주 일정 등)에 근거. 읽기용 완성 문장이되 나중에 텍스트만 교체 가능하도록 배열로 관리.

## 결정 사항 (기본값)

1. 비번: 콘솔만 0803 잠금, 관객 창은 게이트 생략
2. 커버 발표자명("김미성 팀장")은 기존 유지(변경 안 함)

## 검증

Playwright로:
- `present.html` 게이트 해제 → 두 iframe이 현재/다음으로 이동하는지
- 키보드/버튼 이동 시 카운터·대본·미리보기 동기화
- `window.open` 관객 창이 같은 인덱스로 따라오는지
- 콘솔 레이아웃 오버플로 없는지
- 기존 학생 모드(`?screen` 없음) 동작 불변 회귀 확인

## 비채택 대안

- 단일 파일 `?present` 방식: 대본이 학생 파일에 섞여 유출 위험 → 비채택
- reveal.js 등 외부 라이브러리 재작성: 기존 커스텀 디자인 파괴, 오버킬 → 비채택
