# 백석대 버디시스템 주간 신청 체크 — 설계서

작성일: 2026-06-30 · 대상 사이트: lcic-campus.com (lcic-gallery, 정적 HTML + Supabase)

## 1. 목적

백석대학교에서 LCIC로 파견된 학생들이 **매주 수요일** 버디시스템 신청(또는 주간 버디 만남)을
실제로 했는지 본인이 스크린샷으로 자가 보고하고, 그 현황을 관리자가 한 곳에서 주차별로 확인한다.

- 보고 주체: **학생 본인** (자가 보고)
- 주기: **매주 수요일 마감**, 주차별 누적
- 본인 확인: **이메일 + 생년월일 + 휴대폰 끝 4자리** (status.html과 동일 방식)
- 명단 출처: 기존 apply 명단(`scripts/_apply-export.csv`)에서 **University = 백석대** 41명 필터 재사용
- 관리자 열람: **기존** `status-reports.html`에 탭 1개 추가

## 2. 기존 시스템 재사용 (변경 최소화 원칙)

본 기능은 lcic-gallery의 검증된 3-요소 패턴을 그대로 복제한다:

1. **학생 본인확인 게이트** — status.html의 로그인 원시함수 재사용
   `id = sha256(normEmail + PEPPER)[:32]` 로 블롭을 찾고, `cred = email|생일8자리|휴대폰4`
   로 AES-256-GCM 복호화. 복호화 성공 = 본인 인증 + 학생 이름 획득.
2. **Supabase anon-INSERT / admin-read** — student_applications·status_reports와 동일한 RLS.
3. **스토리지 비공개 버킷 + signed URL** — 기존 `status-reports` 버킷 재사용(`buddy/` 하위 폴더).

## 3. 구성요소

### 3.1 신규 학생 페이지: `buddy-check.html`

- **로그인 게이트**: status.html과 동일한 UI/로직(이메일·생일·휴대폰4). 단, 조회 대상은
  새로 주입되는 `BUDDY_BLOBS`(백석대 41명만). 복호화 성공 시 학생 이름을 얻는다.
- **대시보드**(로그인 후):
  - 인사말 + 이번 **주차/마감일** 표시: 예) "3주차 · 이번 주 수요일(2026-07-15)까지 제출".
  - **주차 체크리스트**: 1~N주차 칸. 각 칸은 제출/미제출 표시(본인 기기 localStorage 기준 UX 마킹).
  - **업로드 카드**: 이번 주 버디시스템 신청 스크린샷 1장 선택 → 업로드.
- **제출 동작**:
  1. 파일을 `status-reports` 버킷 `buddy/<uuid>.<ext>` 에 업로드(anon INSERT).
  2. `buddy_checkins` 테이블에 INSERT: `{ student_name, student_email, university,
     week_no, week_label, checkin_date, file_path }`.
  3. 성공 시 localStorage에 해당 주차 제출 마킹 + 토스트.
- **주차 계산**(수요일 앵커): `PROGRAM_START`(프로그램 첫 수요일, 설정 상수)부터
  `week_no = floor((thisWednesday - PROGRAM_START)/7) + 1`. `TOTAL_WEEKS` 범위로 한정.
  프로그램 기간 밖이면 업로드 비활성 + 안내.

### 3.2 기존 관리자 페이지: `status-reports.html` 에 탭 추가

- 4번째 탭 **"버디 신청"**(아이콘 예: `solar:users-group-rounded-bold-duotone`).
- 데이터: `buddy_checkins` 전체를 읽어 **학생(이메일) 단위로 그룹화**.
- 표 컬럼: 학생 / 이메일 / 대학 / **W1 … Wn 주차별 셀**(✓ + 스크린샷 보기 버튼 / 미제출은 —) / 최근 제출.
- 상단 stat 카드: 보고 학생 수, **이번 주 미제출 인원**, 총 제출 건수.
- 검색창(이름·이메일). 스크린샷은 기존과 동일하게 `createSignedUrl(path, 300)`로 새 탭 열람.
- 행/셀 삭제 버튼은 기존 탭들과 동일 패턴.

### 3.3 Supabase

신규 테이블 `buddy_checkins`:

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK default gen_random_uuid() | |
| created_at | timestamptz default now() | |
| student_name | text | |
| student_email | text | 그룹 키 |
| university | text | '백석대학교' |
| week_no | int | 1..N |
| week_label | text | 예 '3주차' |
| checkin_date | date | 해당 주 수요일 |
| file_path | text | 스토리지 경로 |

- RLS: **anon INSERT만** 허용, **admin(로그인) SELECT/DELETE** 허용 (status_reports 정책 복제).
- 스토리지: 기존 `status-reports` 버킷 재사용 → 신규 버킷/정책 불필요(이미 anon upload / admin read).
- 인덱스: `(student_email)`, `(week_no)`.

### 3.4 신규 스크립트: `scripts/encrypt-buddy.cjs`

- 입력: `scripts/_apply-export.csv` (gitignore된 평문 PII).
- 처리: `University` 가 "백석" 포함인 행만 필터 → 각 학생에 대해
  `k = sha256(normEmail + BUDDY_PEPPER)[:32]`, `b = AES-GCM(JSON{name}, cred)` 생성.
- 출력: `buddy-check.html` 의 `@@BUDDY_DATA@@` 센티넬 사이에 상수 주입(블롭은 커밋 안전, CSV/스크립트는 커밋 금지).
- encrypt-status.cjs를 그대로 본떠 normalizer(normEmail/birth8/phone4) 일치 보장.

## 4. 데이터 흐름

```
학생: buddy-check.html
  ├─ 로그인(이메일+생일+휴대폰4) → BUDDY_BLOBS 복호화 → 이름 + 본인확인
  ├─ 이번 주차 자동계산(수요일 앵커)
  └─ 스크린샷 업로드 → 스토리지(buddy/uuid) + buddy_checkins INSERT(anon)
관리자: status-reports.html "버디 신청" 탭
  └─ buddy_checkins SELECT(admin) → 학생×주차 매트릭스 + signed URL 열람
```

## 5. 설정 상수 (구현 전 확정 필요)

- `PROGRAM_START`: 백석대 프로그램 **첫 수요일** 날짜 (예: 2026-07-01).  ← **사용자 확정 필요**
- `TOTAL_WEEKS`: 프로그램 주차 수 (예: 4).  ← **사용자 확정 필요**
- `BUDDY_PEPPER`: status PEPPER와 별개의 고정 문자열(스크립트·페이지 동일값).

## 6. 비범위 (YAGNI)

- 자동 크롤링/외부 버디시스템 API 연동 없음(학생 자가 보고 스크린샷만).
- 자동 리마인더 알림(이메일/문자) 없음 — 추후 별도.
- 학생의 과거 주차 열람은 본인 기기 localStorage 기반 UX만(서버 조회는 관리자 전용).

## 7. 테스트 / 검증

- encrypt-buddy.cjs: 샘플 백석대 학생 1명 cred로 복호화 round-trip 통과 확인.
- buddy-check.html: 올바른 cred 로그인 성공 / 틀린 cred 실패, 주차 계산 경계(시작 전·종료 후) 확인.
- status-reports.html: 신규 탭이 기존 3탭과 독립 동작, 주차 매트릭스·signed URL 열람 확인(Playwright 교차 측정).
