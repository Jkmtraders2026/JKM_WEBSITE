begin;
create table public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.staff_members enable row level security;
revoke all on public.staff_members from anon, authenticated;
grant select on public.staff_members to authenticated;
create policy "Staff can check own membership" on public.staff_members for select to authenticated using (user_id = (select auth.uid()));

create table public.website_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  full_name text not null check (char_length(full_name) between 1 and 120),
  company text not null default '' check (char_length(company)<=160),
  email text not null check (char_length(email)<=200),
  phone text not null check (char_length(phone) between 5 and 40),
  service text not null check (service in ('sourcing','import-export','verification','logistics','consulting','private-label','general')),
  product text not null default '' check (char_length(product)<=240),
  quantity text not null default '' check (char_length(quantity)<=80),
  origin text not null default '' check (char_length(origin)<=120),
  destination text not null check (char_length(destination) between 1 and 120),
  timeline text not null default '' check (char_length(timeline)<=120),
  message text not null check (char_length(message) between 20 and 6000),
  consent_at timestamptz not null default now(),
  status text not null default 'new' check(status in ('new','reviewing','quoted','closed')),
  attachments jsonb not null default '[]'::jsonb check (jsonb_typeof(attachments)='array' and jsonb_array_length(attachments)<=3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index website_requests_created_idx on public.website_requests(created_at desc);
create index website_requests_status_idx on public.website_requests(status);
alter table public.website_requests enable row level security;
revoke all on public.website_requests from anon, authenticated;
grant select on public.website_requests to authenticated;
grant update(status) on public.website_requests to authenticated;
create policy "Only staff may read requests" on public.website_requests for select to authenticated using (exists(select 1 from public.staff_members where user_id=(select auth.uid())));
create policy "Only staff may update status" on public.website_requests for update to authenticated using (exists(select 1 from public.staff_members where user_id=(select auth.uid()))) with check (exists(select 1 from public.staff_members where user_id=(select auth.uid())));
create function public.jkm_touch_request() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at=now(); return new; end; $$;
create trigger website_requests_updated before update on public.website_requests for each row execute function public.jkm_touch_request();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('request-files','request-files',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf']);
create policy "Only staff may read enquiry files" on storage.objects for select to authenticated using (bucket_id='request-files' and exists(select 1 from public.staff_members where user_id=(select auth.uid())));
-- No anonymous table INSERT or storage policies: all public submissions go through the validated Edge Function.
commit;
