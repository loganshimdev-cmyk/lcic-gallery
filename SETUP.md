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

## 사용 방법

- 학생: `https://<사이트주소>/notice.html`, `/faq.html` 에서 읽기만
- 관리자: `/admin.html` 에서 로그인 후 글 작성/수정/삭제

## 문제 해결

- **"Invalid API key"**: `SUPABASE_PUBLISHABLE_KEY` 값이 정확한지 확인
- **글이 안 올라감 (관리자)**: RLS 정책이 제대로 적용되었는지, 로그인이 되어있는지 확인
- **목록이 비어있음 (학생)**: `public read` 정책이 잘 만들어졌는지 확인
- **세션이 자꾸 풀림**: 같은 도메인(GitHub Pages 주소)에서 접속 중인지 확인 (localhost와 배포 도메인은 별개 세션)
