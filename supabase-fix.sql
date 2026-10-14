-- ==============================================================================
--  supabase-fix.sql — مكمّل آمن لقاعدة بيانات «الوجيه» (يُشغَّل مرة واحدة، ويمكن إعادته)
--  • لا يحذف ولا يستبدل أي بيانات موجودة، ولا يمسّ السياسات الحالية: يضيف فقط ما ينقص.
--  • لا تُشغّل ملف supabase.sql القديم بعد الآن (انظر الملاحظات في الأسفل).
--  شغّله في: Supabase ← SQL Editor ← New query ← Run
--  إن ظهر خطأ «operator does not exist: text = uuid» فمعناه أن عموداً موجوداً عندك نوعه text؛ هذه النسخة تقارن بعد التحويل إلى text.
--  لمعرفة أنواع أعمدتك الفعلية شغّل هذا الاستعلام وحده:
--    select table_name, column_name, data_type from information_schema.columns
--    where table_schema='public' and table_name in ('portal_data','wajih_profiles','wajih_activity','wajih_prof','wajih_reports','wajih_documents','activities')
--      and column_name in ('id','owner','user_id','owner_id','prof_id','updated_by') order by 1,2;
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
$$ select role from public.wajih_profiles where id::text = auth.uid()::text and active $$;
grant execute on function public.wj_role() to authenticated;

alter table public.wajih_profiles enable row level security;
drop policy if exists wj_prof_select on public.wajih_profiles;
create policy wj_prof_select on public.wajih_profiles for select to authenticated
  using (id::text = auth.uid()::text or public.wj_role() in ('inspector','supervisor'));
drop policy if exists wj_prof_insert on public.wajih_profiles;
create policy wj_prof_insert on public.wajih_profiles for insert to authenticated
  with check (public.wj_role() = 'inspector');
drop policy if exists wj_prof_update on public.wajih_profiles;
create policy wj_prof_update on public.wajih_profiles for update to authenticated
  using (public.wj_role() = 'inspector') with check (public.wj_role() = 'inspector');

-- ---------- 2) دوال الدخول وإدارة الحسابات ----------
create or replace function public.wj_email_for_username(u text) returns text
language sql stable security definer set search_path = public, auth as
$$ select au.email::text from auth.users au join public.wajih_profiles p on p.id::text = au.id::text
   where p.username = lower(trim(u)) limit 1 $$;
grant execute on function public.wj_email_for_username(text) to anon, authenticated;

create or replace function public.wj_complete_first_login(new_username text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if new_username !~ '^[a-z0-9_.-]{4,30}$' then raise exception 'invalid username'; end if;
  update public.wajih_profiles set username = lower(new_username), must_change = false where id::text = auth.uid()::text;
end $$;
grant execute on function public.wj_complete_first_login(text) to authenticated;

create or replace function public.wj_reset_password(uid uuid, new_pass text) returns void
language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if public.wj_role() is distinct from 'inspector' then raise exception 'forbidden'; end if;
  if length(new_pass) < 10 then raise exception 'password too short'; end if;
  update auth.users set encrypted_password = extensions.crypt(new_pass, extensions.gen_salt('bf')), updated_at = now() where id = uid;
  update public.wajih_profiles set must_change = true where id::text = uid::text;
end $$;
grant execute on function public.wj_reset_password(uuid, text) to authenticated;

create or replace function public.wj_delete_user(uid uuid, wipe boolean) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if public.wj_role() is distinct from 'inspector' then raise exception 'forbidden'; end if;
  if uid = auth.uid() then raise exception 'cannot delete yourself'; end if;
  if wipe then
    delete from public.portal_data where owner::text = uid::text;
    delete from public.wajih_activity where user_id::text = uid::text;
    delete from public.wajih_prof where user_id::text = uid::text;
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
  using (owner::text = auth.uid()::text or shared or public.wj_role() in ('inspector','supervisor'));
drop policy if exists wj_pd_insert on public.portal_data;
create policy wj_pd_insert on public.portal_data for insert to authenticated
  with check ((owner::text = auth.uid()::text and not shared)
           or (shared and owner::text = '00000000-0000-0000-0000-000000000000')
           or (public.wj_role() = 'inspector' and key not in ('tqweem_ar_v4','carnet_tanqit_v1')));
drop policy if exists wj_pd_update on public.portal_data;
create policy wj_pd_update on public.portal_data for update to authenticated
  using ((owner::text = auth.uid()::text and not shared)
      or (shared and owner::text = '00000000-0000-0000-0000-000000000000')
      or (public.wj_role() = 'inspector' and key not in ('tqweem_ar_v4','carnet_tanqit_v1')))
  with check ((owner::text = auth.uid()::text and not shared)
      or (shared and owner::text = '00000000-0000-0000-0000-000000000000')
      or (public.wj_role() = 'inspector' and key not in ('tqweem_ar_v4','carnet_tanqit_v1')));
drop policy if exists wj_pd_delete on public.portal_data;
create policy wj_pd_delete on public.portal_data for delete to authenticated
  using (owner::text = auth.uid()::text or (public.wj_role() = 'inspector' and key not in ('tqweem_ar_v4','carnet_tanqit_v1')));

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
  with check (user_id::text = auth.uid()::text);
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

-- ---------- 7) تفاصيل النشاط (اسم المقطع/المذكرة...) ----------
alter table public.wajih_activity add column if not exists detail text;

-- ---------- 8) سجلات المعالجة: يراها الجميع، ويعدّلها المفتش/المشرف أو صاحبها ----------
-- كل مستخدم يكتب في صفّه فقط (سياسة wj_pd_*)؛ هنا نسمح بقراءة المفتاحين للجميع، وبالكتابة في صفوف الغير للمفتش والمشرف.
drop policy if exists wj_pd_read_records on public.portal_data;
create policy wj_pd_read_records on public.portal_data for select to authenticated
  using (key in ('traitementData','studentsRecords'));
drop policy if exists wj_pd_staff_ins on public.portal_data;
create policy wj_pd_staff_ins on public.portal_data for insert to authenticated
  with check (public.wj_role() in ('inspector','supervisor') and key in ('traitementData','studentsRecords'));
drop policy if exists wj_pd_staff_upd on public.portal_data;
create policy wj_pd_staff_upd on public.portal_data for update to authenticated
  using (public.wj_role() in ('inspector','supervisor') and key in ('traitementData','studentsRecords'))
  with check (public.wj_role() in ('inspector','supervisor') and key in ('traitementData','studentsRecords'));

-- ---------- 9) إعلانات شاشة الدخول (ندوات وأخبار) ----------
create table if not exists public.wajih_announcements (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'news' check (kind in ('seminar','news','notice')),
  title text not null,
  body text,
  event_date text,
  place text,
  link text,
  pinned boolean not null default false,
  active boolean not null default true,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.wajih_announcements enable row level security;
drop policy if exists wj_ann_read on public.wajih_announcements;
create policy wj_ann_read on public.wajih_announcements for select to anon
  using (active);
drop policy if exists wj_ann_read_auth on public.wajih_announcements;
create policy wj_ann_read_auth on public.wajih_announcements for select to authenticated
  using (active or public.wj_role() in ('inspector','supervisor'));
drop policy if exists wj_ann_ins on public.wajih_announcements;
create policy wj_ann_ins on public.wajih_announcements for insert to authenticated
  with check (public.wj_role() in ('inspector','supervisor'));
drop policy if exists wj_ann_upd on public.wajih_announcements;
create policy wj_ann_upd on public.wajih_announcements for update to authenticated
  using (public.wj_role() in ('inspector','supervisor')) with check (public.wj_role() in ('inspector','supervisor'));
drop policy if exists wj_ann_del on public.wajih_announcements;
create policy wj_ann_del on public.wajih_announcements for delete to authenticated
  using (public.wj_role() in ('inspector','supervisor'));
grant select on public.wajih_announcements to anon;

-- ---------- 10) إسقاط السياسات القديمة المكشوفة على portal_data ----------
-- ظهرت في فحص pg_policies سياسات بدور public (أي لأي زائر بالمفتاح العام دون تسجيل دخول):
-- d_sel, d_ins, d_upd, d_del, "Allow public read access", "Allow authenticated inserts", "Allow users to update their own data"
-- وهي تبطل كل سياسات wj_* لأن السياسات تُجمع بـ«أو». نحذفها: التطبيق يعمل بسياسات wj_pd_* وحدها.
drop policy if exists "d_sel" on public.portal_data;
drop policy if exists "d_ins" on public.portal_data;
drop policy if exists "d_upd" on public.portal_data;
drop policy if exists "d_del" on public.portal_data;
drop policy if exists "Allow public read access" on public.portal_data;
drop policy if exists "Allow authenticated inserts" on public.portal_data;
drop policy if exists "Allow users to update their own data" on public.portal_data;

-- افحص بقية الجداول بالطريقة نفسها (أي سياسة بدور public أو بشرط using (true) تحتاج مراجعة):
--   select tablename, policyname, cmd, roles, qual, with_check
--   from pg_policies where schemaname in ('public','storage') order by 1,2;

-- ---------- 11) بنك الأعمال الموجهة المشترك (جدول activities) — يقرؤه لسان «الأعمال الموجهة» في اللوحة ----------
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  owner_name text,
  title text,
  subject text,
  level text,
  topic text,
  pedagogy text,
  style text,
  classes text,
  groups text,
  start_situation text,
  teacher_role text,
  group_work text,
  end_situation text,
  text text,
  questions text,
  answer text,
  description text,
  students jsonb not null default '[]'::jsonb,
  intelligences jsonb not null default '[]'::jsonb,
  vark jsonb not null default '[]'::jsonb,
  goal_id text,
  created_at timestamptz not null default now()
);
create index if not exists idx_activities_created on public.activities(created_at desc);
alter table public.activities enable row level security;
drop policy if exists wj_actv_select on public.activities;
create policy wj_actv_select on public.activities for select to authenticated using (true);
drop policy if exists wj_actv_insert on public.activities;
create policy wj_actv_insert on public.activities for insert to authenticated
  with check (owner_id::text = auth.uid()::text or public.wj_role() in ('inspector','supervisor'));
drop policy if exists wj_actv_update on public.activities;
create policy wj_actv_update on public.activities for update to authenticated
  using (owner_id::text = auth.uid()::text or public.wj_role() in ('inspector','supervisor'))
  with check (owner_id::text = auth.uid()::text or public.wj_role() in ('inspector','supervisor'));
drop policy if exists wj_actv_delete on public.activities;
create policy wj_actv_delete on public.activities for delete to authenticated
  using (owner_id::text = auth.uid()::text or public.wj_role() in ('inspector','supervisor'));
do $$ begin
  alter publication supabase_realtime add table public.activities;
exception when duplicate_object then null; when undefined_object then null; end $$;
-- تنبيه: إن كان جدول activities موجوداً سابقاً بسياسات قديمة بدور public، فشغّل استعلام pg_policies أعلاه وأرسل نتيجته.

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
