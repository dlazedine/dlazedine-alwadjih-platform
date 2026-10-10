-- ==============================================================================
--  supabase-fix.sql — مكمّل آمن لقاعدة بيانات «الوجيه» (يُشغَّل مرة واحدة، ويمكن إعادته)
--  • لا يحذف ولا يستبدل أي بيانات موجودة، ولا يمسّ السياسات الحالية: يضيف فقط ما ينقص.
--  • لا تُشغّل ملف supabase.sql القديم بعد الآن (انظر الملاحظات في الأسفل).
--  شغّله في: Supabase ← SQL Editor ← New query ← Run
-- ==============================================================================
create extension if not exists pgcrypto with schema extensions;

-- ---------- 1) الملفات الشخصية والأدوار (يستعملها portal-cloud.js) ----------
create table if not exists public.wajih_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  role text not null default 'teacher' check (role in ('inspector','supervisor','teacher')),
  school text,
  active boolean not null default true,
  must_change boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.wajih_profiles add column if not exists full_name text;
alter table public.wajih_profiles add column if not exists school text;
alter table public.wajih_profiles add column if not exists active boolean not null default true;
alter table public.wajih_profiles add column if not exists must_change boolean not null default false;
alter table public.wajih_profiles add column if not exists created_at timestamptz not null default now();
alter table public.wajih_profiles alter column active set default true;
update public.wajih_profiles set active = true where active is null;

-- دالة الدور (security definer لتفادي التكرار اللانهائي داخل سياسات RLS)
create or replace function public.wj_role() returns text
language sql stable security definer set search_path = public as
$$ select role from public.wajih_profiles where id = auth.uid() and active $$;
grant execute on function public.wj_role() to authenticated;

alter table public.wajih_profiles enable row level security;
drop policy if exists wj_prof_select on public.wajih_profiles;
create policy wj_prof_select on public.wajih_profiles for select to authenticated
  using (id = auth.uid() or public.wj_role() in ('inspector','supervisor'));
drop policy if exists wj_prof_insert on public.wajih_profiles;
create policy wj_prof_insert on public.wajih_profiles for insert to authenticated
  with check (public.wj_role() = 'inspector');
drop policy if exists wj_prof_update on public.wajih_profiles;
create policy wj_prof_update on public.wajih_profiles for update to authenticated
  using (public.wj_role() = 'inspector') with check (public.wj_role() = 'inspector');

-- ---------- 2) دوال الدخول وإدارة الحسابات ----------
create or replace function public.wj_email_for_username(u text) returns text
language sql stable security definer set search_path = public, auth as
$$ select au.email::text from auth.users au join public.wajih_profiles p on p.id = au.id
   where p.username = lower(trim(u)) limit 1 $$;
grant execute on function public.wj_email_for_username(text) to anon, authenticated;

create or replace function public.wj_complete_first_login(new_username text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if new_username !~ '^[a-z0-9_.-]{4,30}$' then raise exception 'invalid username'; end if;
  update public.wajih_profiles set username = lower(new_username), must_change = false where id = auth.uid();
end $$;
grant execute on function public.wj_complete_first_login(text) to authenticated;

create or replace function public.wj_reset_password(uid uuid, new_pass text) returns void
language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if public.wj_role() is distinct from 'inspector' then raise exception 'forbidden'; end if;
  if length(new_pass) < 10 then raise exception 'password too short'; end if;
  update auth.users set encrypted_password = extensions.crypt(new_pass, extensions.gen_salt('bf')), updated_at = now() where id = uid;
  update public.wajih_profiles set must_change = true where id = uid;
end $$;
grant execute on function public.wj_reset_password(uuid, text) to authenticated;

create or replace function public.wj_delete_user(uid uuid, wipe boolean) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if public.wj_role() is distinct from 'inspector' then raise exception 'forbidden'; end if;
  if uid = auth.uid() then raise exception 'cannot delete yourself'; end if;
  if wipe then
    delete from public.portal_data where owner = uid;
    delete from public.wajih_activity where user_id = uid;
    delete from public.wajih_prof where user_id = uid;
  end if;
  delete from auth.users where id = uid;
end $$;
grant execute on function public.wj_delete_user(uuid, boolean) to authenticated;

-- ---------- 3) المزامنة: بيانات كل مستخدم (والمشتركة) ----------
create table if not exists public.portal_data (
  owner uuid not null,
  key text not null,
  value text,
  shared boolean not null default false,
  updated_by uuid,
  updated_by_name text,
  updated_by_role text,
  updated_at timestamptz not null default now(),
  touched boolean not null default false,
  edited_by_name text,
  edited_at timestamptz,
  primary key (owner, key)
);
alter table public.portal_data add column if not exists touched boolean not null default false;
alter table public.portal_data add column if not exists edited_by_name text;
alter table public.portal_data add column if not exists edited_at timestamptz;
alter table public.portal_data add column if not exists updated_by_role text;
alter table public.portal_data add column if not exists updated_by_name text;
alter table public.portal_data add column if not exists updated_by uuid;
alter table public.portal_data add column if not exists shared boolean not null default false;
create index if not exists idx_portal_data_shared on public.portal_data(shared) where shared;

alter table public.portal_data enable row level security;
drop policy if exists wj_pd_select on public.portal_data;
create policy wj_pd_select on public.portal_data for select to authenticated
  using (owner = auth.uid() or shared or public.wj_role() in ('inspector','supervisor'));
drop policy if exists wj_pd_insert on public.portal_data;
create policy wj_pd_insert on public.portal_data for insert to authenticated
  with check ((owner = auth.uid() and not shared)
           or (shared and owner = '00000000-0000-0000-0000-000000000000'::uuid)
           or public.wj_role() = 'inspector');
drop policy if exists wj_pd_update on public.portal_data;
create policy wj_pd_update on public.portal_data for update to authenticated
  using ((owner = auth.uid() and not shared)
      or (shared and owner = '00000000-0000-0000-0000-000000000000'::uuid)
      or public.wj_role() = 'inspector')
  with check ((owner = auth.uid() and not shared)
      or (shared and owner = '00000000-0000-0000-0000-000000000000'::uuid)
      or public.wj_role() = 'inspector');
drop policy if exists wj_pd_delete on public.portal_data;
create policy wj_pd_delete on public.portal_data for delete to authenticated
  using (owner = auth.uid() or public.wj_role() = 'inspector');

-- ---------- 4) سجل النشاط (يغذّي مراقبة النشاطات في لوحة التحكم) ----------
create table if not exists public.wajih_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  user_name text,
  user_role text,
  action text not null,
  key text,
  created_at timestamptz not null default now()
);
create index if not exists idx_wajih_activity_created on public.wajih_activity(created_at desc);
alter table public.wajih_activity enable row level security;
drop policy if exists wj_act_insert on public.wajih_activity;
create policy wj_act_insert on public.wajih_activity for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists wj_act_select on public.wajih_activity;
create policy wj_act_select on public.wajih_activity for select to authenticated
  using (public.wj_role() in ('inspector','supervisor'));
drop policy if exists wj_act_delete on public.wajih_activity;
create policy wj_act_delete on public.wajih_activity for delete to authenticated
  using (public.wj_role() = 'inspector');

-- بث مباشر لإشعارات اللوحة
do $$ begin
  alter publication supabase_realtime add table public.wajih_activity;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- ---------- 5) أعمدة ناقصة في الجداول الحالية ----------
alter table public.wajih_prof add column if not exists user_id uuid;
alter table public.wajih_prof add column if not exists insp jsonb not null default '{}'::jsonb;
alter table public.wajih_prof add column if not exists tt jsonb not null default '{}'::jsonb;
alter table public.wajih_prof add column if not exists photo text;
alter table public.wajih_prof add column if not exists updated_by_name text;

-- حذف الأستاذ يحذف تقاريره فعلاً (كما تعد رسالة التأكيد في data-prof.html)
alter table public.wajih_reports drop constraint if exists wajih_reports_prof_id_fkey;
alter table public.wajih_reports add constraint wajih_reports_prof_id_fkey
  foreign key (prof_id) references public.wajih_prof(id) on delete cascade;

-- ---------- 6) تخزين الملفات ----------
-- حدّ 50 م.ب هو أقصى حدّ في الخطة المجانية (ارفعه من Storage ← Settings إن كانت خطتك تسمح)
insert into storage.buckets (id, name, public, file_size_limit)
values ('portal-files', 'portal-files', false, 52428800)
on conflict (id) do update set file_size_limit = 52428800, public = false;

update storage.buckets set file_size_limit = 52428800 where id = 'exams';

drop policy if exists wj_pf_read on storage.objects;
create policy wj_pf_read on storage.objects for select to authenticated using (bucket_id = 'portal-files');
drop policy if exists wj_pf_insert on storage.objects;
create policy wj_pf_insert on storage.objects for insert to authenticated with check (bucket_id = 'portal-files');
drop policy if exists wj_pf_delete on storage.objects;
create policy wj_pf_delete on storage.objects for delete to authenticated using (bucket_id = 'portal-files');

-- ==============================================================================
--  ملاحظات مهمة
--  1) supabase.sql القديم: لا تشغّله مجدداً. فهو يعيد كتابة قائمة المتوسطات (schools) بالقائمة الافتراضية،
--     ويدرج حسابات في wajih_users بكلمة مرور نصّية «prof2026» مقروءة لأي شخص يملك المفتاح العام،
--     ويفتح الجداول بسياسات «Anyone can» (قراءة وكتابة وحذف لأي زائر دون دخول).
--  2) جدول wajih_users و wajih_activities غير مستعملين في الكود الحالي. بعد أخذ نسخة احتياطية يُستحسن:
--        drop table if exists public.wajih_users;
--        drop table if exists public.wajih_activities;
--  3) سياسات «Anyone can» على wajih_prof و wajih_reports و wajih_documents و wajih_settings ما زالت قائمة
--     (لم أمسّها كي لا يتعطل التطبيق). بعد التأكد أن كل شيء يعمل، استبدلها بسياسات للمسجَّلين فقط
--     (to authenticated) ثم قيّد التعديل والحذف بالمفتش أو بصاحب السجل.
--  4) أول حساب مفتش (إن لم يوجد بعد): أنشئ مستخدماً من Authentication ← Users بالبريد
--     <اسم>@wajih-portal.dz ثم نفّذ (بدّل المعرّف والاسم):
--        insert into public.wajih_profiles (id, username, full_name, role, must_change)
--        values ('<UUID المستخدم>', 'insp_xxx', 'الاسم الكامل', 'inspector', false);
-- ==============================================================================
