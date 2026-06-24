# 학생 정보 수집 폼 + 관리자 CSV 추출 — 설계

작성일: 2026-06-24

## 목적
학생들에게 **링크 하나**를 주면, 한국어로 친절하게 번역된 입력 폼에서 본인 정보를 입력한다.
관리자(Miguel)만 전체 제출 데이터를 보고 **클릭 한 번으로 `students.csv` 형식 그대로** 내려받아
외부 학생관리 시스템(lcic-students-system.com)에 일괄 업로드한다.

## 핵심 제약 (보안)
- 학생은 **제출(INSERT)만** 가능, **다른 학생의 데이터를 절대 조회 불가**.
- 관리자(로그인)만 전체 SELECT/삭제.

## 데이터
- Supabase 프로젝트: `cedienlogevuhgqmcgph` (lcic-cels, notices/faqs와 동일).
- 테이블: `student_applications` — 39개 입력 컬럼(전부 text) + `id uuid` + `created_at timestamptz`.
- RLS:
  - `anon` → INSERT만 (SELECT 정책 없음).
  - `authenticated`(관리자) → SELECT / UPDATE / DELETE.

## 파일
| 파일 | 역할 | 접근 |
|---|---|---|
| `assets/student-fields.js` | 39개 필드 단일 정의(키·라벨·설명·타입·필수·섹션). 폼·CSV 공통 소스 | — |
| `apply.html` | 학생용 한국어 입력 폼 (배포할 링크) | 공개 (로그인 X) |
| `apply-admin.html` | 관리자 전용: 목록 + CSV 다운로드 + 행 삭제 | 관리자 로그인 |

## CSV 규칙
- 헤더 = `students.csv` 39개 열을 **순서·철자 그대로** 보존.
- 행 = 각 제출을 헤더 순서대로 매핑, RFC4180 방식 escape(따옴표·콤마·줄바꿈).
- 인코딩: UTF-8(BOM 없음, 템플릿과 동일).

## 필수 필드 (핵심만)
email, first_name, last_name, first_name_passport, last_name_passport,
gender, birthday, phone, nationality, country. — **나머지는 모두 선택.**

## 폼 섹션 순서 (표시용; CSV 순서와 별개)
① 기본 정보 ② 여권 정보 ③ 주소 ④ 소속 & 연수 ⑤ 비상 연락처 ⑥ 기타

## 가정 (외부 시스템 포맷 의존 — 테스트 후 1줄 수정 가능)
- 날짜: `YYYY-MM-DD`(ISO).
- 성별: CSV에 `Male`/`Female`(화면엔 남성/여성).

## 1회 셋업
`SETUP.md`에 테이블 + RLS 생성 SQL 추가 → 대시보드 SQL Editor에서 1회 실행.
(DDL은 대시보드에서 직접 실행. 데이터 백필 없음 — 신규 수집용)

## 디자인
기존 `assets/shared.css`(라이트 테마, blue accent, Pretendard) 토큰 사용.
