-- 💰 납부 현황 체크리스트 공유 저장 (invoice.html · "납부 현황" 탭 / team.html 납부현황 탭)
-- CELS Supabase(cedienlogevuhgqmcgph) SQL Editor에 붙여넣고 한 번 실행하세요.
--
-- 체크(인보이스 발급/송금/송금증 전달/회계 확인)와 학교 목록을 서버에 저장해
-- 페이지를 보는 모든 담당자에게 공유한다. invoice.html은 비밀번호 게이트 뒤라 anon CRUD 허용.

create table if not exists public.invoice_pay_items (
  id         text primary key,                 -- 클라이언트 생성 id (p1.. / p<타임스탬프>)
  label      text not null default '',         -- 학교/구분 (예: 전북대 7월)
  pos        int  not null default 0,          -- 표시 순서
  inv        boolean not null default false,   -- ① 인보이스 발급
  remit      boolean not null default false,   -- ② 송금
  receipt    boolean not null default false,   -- ③ 송금증 전달
  confirm    boolean not null default false,   -- ④ 회계 확인
  updated_at timestamptz not null default now()
);

alter table public.invoice_pay_items enable row level security;

drop policy if exists "anon all invoice_pay" on public.invoice_pay_items;
create policy "anon all invoice_pay" on public.invoice_pay_items for all using (true) with check (true);

grant select, insert, update, delete on public.invoice_pay_items to anon, authenticated;
