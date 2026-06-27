# LCIC 학생 페이지 셋업 가이드

학생용 공지사항/FAQ 페이지를 처음 띄우기 위한 1회성 작업.

## 1. Supabase 테이블 생성

Supabase 대시보드 → **SQL Editor** → 새 쿼리 → 아래 SQL 붙여넣고 Run.

```sql
-- 공지사항
create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  pinned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists notices_pinned_created_idx
  on notices (pinned desc, created_at desc);

-- FAQ
create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  category text,
  question text not null,
  answer text not null,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists faqs_category_sort_idx
  on faqs (category, sort_order);
```

## 2. RLS (Row Level Security) 정책

같은 SQL Editor에서 이어서 실행.

```sql
alter table notices enable row level security;
alter table faqs enable row level security;

-- 모든 사용자가 SELECT 가능
create policy "public read notices"
  on notices for select
  using (true);

create policy "public read faqs"
  on faqs for select
  using (true);

-- 로그인된 사용자(=관리자)만 INSERT/UPDATE/DELETE
create policy "auth all notices"
  on notices for all
  to authenticated
  using (true) with check (true);

create policy "auth all faqs"
  on faqs for all
  to authenticated
  using (true) with check (true);
```

## 3. 관리자 계정 생성

1. Supabase 대시보드 → **Authentication** → **Users** → **Add user**
2. 이메일/비밀번호 입력 (예: `admin@lcic.local` 같은 가상 이메일도 OK)
3. **Auto Confirm User** 체크
4. **Create user**

## 4. 외부 회원가입 차단 (선택)

관리자 외 누구도 가입 못 하게:

- Authentication → **Providers** → **Email** → **Enable signups** OFF

## 5. Publishable Key 입력

1. Supabase 대시보드 → **Settings** → **API Keys** → **Publishable key** 전체 복사
2. `assets/supabase.js` 열어서 `SUPABASE_PUBLISHABLE_KEY` 값 교체:
   ```js
   export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_여기에붙여넣기...";
   ```

## 6. 배포

```bash
git add .
git commit -m "Add notice board, FAQ, and admin pages"
git push
```

GitHub Pages 워크플로우(`.github/workflows/pages.yml`)가 자동으로 빌드/배포.

---

# 학생 정보 수집 폼 (apply.html) 셋업

학생에게 링크 하나(`/apply.html`)를 주고, 입력 결과를 관리자(`/apply-admin.html`)에서
CSV로 받기 위한 1회성 작업. **메인 앱과 같은 Supabase**(notices/faqs와 동일 프로젝트)를 사용한다.

## A. 테이블 생성

Supabase 대시보드 → **SQL Editor** → 새 쿼리 → 아래 SQL 붙여넣고 Run.
(컬럼 순서/이름은 `students.csv` 업로드 양식과 동일)

```sql
create table if not exists student_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  email text,
  first_name text,
  last_name text,
  first_name_passport text,
  last_name_passport text,
  middlename_passport text,
  gender text,
  national_number text,
  phone text,
  postal text,
  state text,
  city text,
  address text,
  about text,
  birthday text,
  country text,
  nationality text,
  study_period_start text,
  study_period_end text,
  number_of_weeks text,
  stay_period_start text,
  stay_period_end text,
  university text,
  academic_year text,
  faculty text,
  department text,
  agency text,
  "group" text,
  passport_number text,
  passport_date_of_issue text,
  passport_expiration_date text,
  emergency_contact_name text,
  emergency_contact_relationship text,
  emergency_contact_email text,
  emergency_contact_phone text,
  emergency_contact_address text,
  university_incharge_name text,
  agency_incharge_name text,
  course text
);
create index if not exists student_applications_created_idx
  on student_applications (created_at desc);
```

> 참고: `group`은 SQL 예약어라 컬럼명에 큰따옴표(`"group"`)가 필요하다. 그 외 컬럼은 그대로.
> 날짜/주수도 전부 `text`로 저장해 학생이 입력한 형식을 그대로 보존한다.

## B. RLS 정책 (보안의 핵심)

같은 SQL Editor에서 이어서 실행. **학생은 제출만 가능하고 서로의 데이터를 볼 수 없다.**

```sql
alter table student_applications enable row level security;

-- 누구나(비로그인 포함) 제출(INSERT)만 가능 — SELECT 정책은 만들지 않는다.
create policy "anyone can submit application"
  on student_applications for insert
  to anon, authenticated
  with check (true);

-- 로그인된 관리자만 전체 조회/수정/삭제
create policy "admin can read applications"
  on student_applications for select
  to authenticated using (true);

create policy "admin can modify applications"
  on student_applications for update
  to authenticated using (true) with check (true);

create policy "admin can delete applications"
  on student_applications for delete
  to authenticated using (true);
```

> ⚠️ **SELECT 정책을 `anon`에게 만들지 말 것.** 만들면 학생이 다른 학생 데이터를 볼 수 있다.
> 관리자 계정은 위 "3. 관리자 계정 생성"에서 만든 계정을 그대로 쓰면 된다.

## C. 사용

- 학생에게 줄 링크: `https://lcic-campus.com/apply.html`
- 관리자: `https://lcic-campus.com/apply-admin.html` 로그인 → 목록 확인 → **CSV 다운로드** → 학생관리 시스템에 업로드
- CSV 날짜는 `YYYY-MM-DD`, 성별은 `Male`/`Female`로 출력된다. 외부 시스템이 다른 형식을
  요구하면 `assets/student-fields.js`(성별 값)와 입력 형식만 조정하면 된다.

---

# 준비현황 정정 신고 (`status.html` → `status-reports.html`)

학생이 `status.html`에서 본인 현황(항공편 등)이 실제와 다를 때 누르는 "정보가 틀려요"
신고를 모으는 테이블. 학생은 **신고 등록만** 가능하고, 관리자만 `status-reports.html`에서
읽는다. `student_applications`와 동일한 anon-INSERT / admin-read 패턴.

## A. 테이블 생성

Supabase 대시보드 → **SQL Editor** → 아래 SQL 붙여넣고 Run.

```sql
create table if not exists status_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  student_name text,
  student_email text,
  category text,            -- 신고 항목 (예: 'flight')
  on_file text,             -- 현재 등록된 값(참고용)
  correction text,          -- 학생이 적은 올바른 정보
  file_paths text[],        -- 첨부파일 경로 목록(최대 5개, 비공개 버킷 status-reports 내)
  resolved boolean default false
);
create index if not exists status_reports_created_idx
  on status_reports (created_at desc);
```

> 이미 테이블을 만든 뒤 첨부 기능을 추가한다면 컬럼만 더하면 된다:
> `alter table status_reports add column if not exists file_paths text[];`

## B. RLS 정책

```sql
alter table status_reports enable row level security;

-- 누구나 신고 등록(INSERT)만 가능 — SELECT 정책은 anon에게 만들지 않는다.
create policy "anyone can submit report"
  on status_reports for insert
  to anon, authenticated
  with check (true);

-- 로그인된 관리자만 조회/수정(처리완료 토글)/삭제
create policy "admin can read reports"
  on status_reports for select
  to authenticated using (true);

create policy "admin can modify reports"
  on status_reports for update
  to authenticated using (true) with check (true);

create policy "admin can delete reports"
  on status_reports for delete
  to authenticated using (true);
```

> ⚠️ `anon`에게 SELECT 정책을 만들지 말 것 — 만들면 학생이 다른 학생 신고를 볼 수 있다.

## C. 첨부파일 저장소 (Storage)

학생이 실제 항공권(e-ticket) 사진·PDF를 첨부할 수 있다. 개인정보가 있으므로 **비공개 버킷**.

1. Supabase 대시보드 → **Storage** → **New bucket** → 이름 `status-reports`,
   **Public 체크 해제(비공개)** → 생성. (또는 아래 SQL로 생성)

```sql
insert into storage.buckets (id, name, public)
values ('status-reports', 'status-reports', false)
on conflict (id) do nothing;
```

2. 정책: **누구나 업로드(INSERT)만 가능, 관리자만 읽기**. SQL Editor에서 실행:

```sql
-- 학생(비로그인)도 status-reports 버킷에 업로드 가능
create policy "anyone can upload report file"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'status-reports');

-- 로그인된 관리자만 파일 열람(서명 URL 생성)
create policy "admin can read report files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'status-reports');

-- 로그인된 관리자만 파일 삭제
create policy "admin can delete report files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'status-reports');
```

> 버킷이 **비공개**라 학생은 자기가 올린 파일조차 URL로 못 본다(업로드 전용).
> 관리자 페이지는 300초짜리 **서명 URL**로만 연다.
> 첨부는 신고당 **최대 5장**, 각 파일 **최대 10MB**(클라이언트에서 제한).

## D. 사용

- 학생: `status.html`에서 항공편 정보가 틀리면 "정보가 틀려요" → 올바른 정보 입력
  **또는 항공권 사진·PDF 첨부** → 신고
- 관리자: `https://lcic-campus.com/status-reports.html` 로그인(apply-admin과 동일 계정) →
  신고 목록·**첨부 보기** 확인 → 처리하면 "처리완료" 토글

---

## 사용 방법

- 학생: `https://<사이트주소>/notice.html`, `/faq.html` 에서 읽기만
- 관리자: `/admin.html` 에서 로그인 후 글 작성/수정/삭제

## 문제 해결

- **"Invalid API key"**: `SUPABASE_PUBLISHABLE_KEY` 값이 정확한지 확인
- **글이 안 올라감 (관리자)**: RLS 정책이 제대로 적용되었는지, 로그인이 되어있는지 확인
- **목록이 비어있음 (학생)**: `public read` 정책이 잘 만들어졌는지 확인
- **세션이 자꾸 풀림**: 같은 도메인(GitHub Pages 주소)에서 접속 중인지 확인 (localhost와 배포 도메인은 별개 세션)
