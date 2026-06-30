# 한국팀 보드 (team.html) — 설계 문서

작성일: 2026-06-30
대상: lcic-campus.com (lcic-gallery) 내 한국담당자 전용 협업 페이지

## 1. 배경 / 목적

한국담당자들이 지금은 일정·할 일·공유사항을 모두 카카오톡으로 주고받는다.
정리가 안 되고, 누가 무엇을 맡았는지·끝났는지 추적이 어렵다.
일정 관리 + 공유 할 일 + 서로 챙기고 확인하는 흐름을 한 곳에 모은다.

## 2. 핵심 결정 사항 (브레인스토밍 확정)

- 성격: **공유 할일판 + 공유 캘린더, 둘 다 대등**하게.
- 로그인: **개인별 계정** (Supabase Auth, admin.html과 세션 공유).
- 알림: **페이지 안 표시만** (카톡/이메일 외부 알림 없음). 추후 확장 여지.
- 코멘트: **포함** (할 일 카드에 한 줄씩 서로 댓글 → "서로 챙김"의 핵심).
- 할 일 화면: **칸반 3열** (할 일 / 진행중 / 완료).
- 화면 언어: **한국어** (한국담당자 전용이므로 LCIC 영어 UI 규칙의 예외).

## 3. 아키텍처 / 인증

- 신규 정적 페이지 `team.html` 1장. 제목 "한국팀 보드 · LCIC".
- 기존 `assets/shared.css`(밝은 배경 + 블루 + Pretendard) 디자인 시스템 사용.
- `assets/supabase.js`의 기존 클라이언트/세션(`storageKey: lcic-admin-auth`) 재사용.
- 인증: `supabase.auth.signInWithPassword` (admin.html과 동일). 계정은 Supabase 대시보드에서 수동 생성.
- 첫 로그인 시 본인 표시이름(한글)·개인색이 없으면 등록 모달 → `team_members`에 upsert.
- GitHub Pages 정적 배포(기존 그대로). 빌드 단계 없음.

## 4. 데이터 모델 (Supabase, Postgres)

모든 테이블 RLS: **로그인(authenticated) 사용자만 SELECT/INSERT/UPDATE/DELETE**. 익명(anon)은 전부 차단.

### team_members
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | = auth.users.id |
| name | text NOT NULL | 한글 표시이름 |
| color | text NOT NULL | 캘린더/뱃지 색 (hex), 등록 시 자동 배정·변경 가능 |
| active | bool DEFAULT true | 비활성 담당자 숨김 |
| created_at | timestamptz DEFAULT now() | |

### team_tasks
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK DEFAULT gen_random_uuid() | |
| title | text NOT NULL | |
| detail | text NULL | |
| assignee_id | uuid NULL → team_members(id) | 담당자, null = 공용/미지정 |
| due_date | date NULL | 마감일 |
| status | text NOT NULL DEFAULT 'todo' | 'todo' / 'doing' / 'done' |
| sort | int DEFAULT 0 | 열 내 정렬 순서 |
| created_by | uuid → team_members(id) | |
| done_at | timestamptz NULL | 완료 시각 |
| done_by | uuid NULL → team_members(id) | 완료한 사람 |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz DEFAULT now() | 트리거로 갱신 |

### team_events
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK DEFAULT gen_random_uuid() | |
| title | text NOT NULL | |
| date | date NOT NULL | 시작일(단일 날짜 기준) |
| all_day | bool DEFAULT true | |
| start_time | time NULL | all_day=false일 때 |
| end_time | time NULL | |
| owner_id | uuid NULL → team_members(id) | 관련 담당자(색 표시) |
| detail | text NULL | |
| created_by | uuid → team_members(id) | |
| created_at | timestamptz DEFAULT now() | |

### team_comments
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK DEFAULT gen_random_uuid() | |
| task_id | uuid NOT NULL → team_tasks(id) ON DELETE CASCADE | |
| author_id | uuid → team_members(id) | |
| body | text NOT NULL | |
| created_at | timestamptz DEFAULT now() | |

## 5. 화면 구성

상단: 로고/제목 · 로그인한 본인 이름 · 탭 전환(할일판 / 캘린더) · 로그아웃.

### 상단 요약 바 (양 탭 공통)
- **내 미완료 N건** · **오늘 일정 N건** · **마감 지난 N건**(빨간점) 칩.
- 클릭하면 해당 항목으로 필터/이동.

### 탭 1 — 🗂 할일판 (칸반 3열)
- 열: 할 일(todo) / 진행중(doing) / 완료(done).
- 카드 표시: 제목, 담당자 색 뱃지+이름, 마감일(지나면 빨간색), 코멘트 수.
- 카드 이동: 드래그 또는 카드 내 상태 버튼으로 열 이동(status 변경). done 이동 시 done_at/done_by 기록.
- 카드 클릭 → 상세 패널: 제목/내용/담당자/마감일 편집, 코멘트 목록 + 한 줄 입력.
- 상단 필터: "내 담당만 / 전체", "완료 숨기기" 토글.
- "+ 새 할 일" 버튼 → 빠른 추가(제목·담당자·마감일).

### 탭 2 — 📅 캘린더 (월간)
- 월 그리드. 각 날짜 칸에 그날의 일정 + 마감 예정 할 일을 담당자 색 점/막대로 표시.
- 이전/다음 달 이동, "오늘로".
- 날짜 클릭 → 그날 일정·할일 목록 + "+ 일정 추가"(제목·시간/종일·담당자·메모).

## 6. "서로 챙김 / 확인" 동작 (페이지 내, 외부 알림 없음)

- 요약 바 카운트로 본인 책임/급한 것 즉시 인지.
- 완료 카드에 "누가·언제 완료" 표기 → 서로 확인.
- **NEW 배지**: localStorage에 마지막 방문 시각 저장, 그 이후 created_at/updated_at이 더 최신인 카드·코멘트에 NEW 표시. (서버 읽음추적은 MVP 제외.)
- 코멘트로 인계/확인을 카드 안에서 주고받음(카톡 흩어짐 해소).

## 7. 운영 / 배포

- 셋업 SQL(테이블·RLS·트리거·색 배정 함수)을 `SETUP.md`에 추가, Supabase 대시보드에서 1회 실행.
- 한국담당자 계정은 대시보드 Auth에서 수동 생성 후 본인 첫 로그인 시 이름/색 등록.
- 진입: 직접 URL(`/team.html`). index.html에는 노출하지 않거나 한국팀만 아는 위치에 링크.

## 8. 비범위 (이번에 안 함 / YAGNI)

- 카카오톡·이메일 등 외부 알림 (페이지 내 표시만).
- 멘션, 파일 첨부, 실시간 구독(realtime). 새로고침/재진입 시 최신 반영.
- 서버 기반 읽음추적(읽은 사람 목록). NEW 배지는 클라이언트 localStorage 기준.
- 반복 일정, 다중일 이벤트(시작~종료 기간). 단일 날짜 일정만.
- 권한 등급(관리자/일반 구분). 로그인한 한국담당자는 모두 동일 권한.

## 9. 성공 기준

- 한국담당자가 카톡 대신 이 페이지에서 할 일을 등록/할당/완료 처리한다.
- 들어오면 내 할 일·오늘 일정·지난 마감이 한눈에 보인다.
- 할 일에 코멘트로 인계·확인이 남아 추적된다.
- 일정이 달력에 담당자 색으로 모여 함께 보인다.
