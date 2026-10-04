-- =========================================================
-- الوجيه: قاعدة البيانات (Supabase) — شغّل الملف كاملاً في SQL Editor
-- =========================================================
create table if not exists wajih_profiles(
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  full_name text, school text,
  role text not null check (role in ('inspector','supervisor','teacher')),
  active boolean not null default true,
  must_change boolean not null default false,
  created_at timestamptz default now());

create table if not exists portal_data(
  owner uuid not null, key text not null, value text,
  shared boolean not null default false,
  updated_by uuid, updated_by_name text, updated_by_role text,
  updated_at timestamptz default now(),
  edited_by_name text, edited_at timestamptz,
  primary key(owner,key));

create or replace function wj_is_role(r text[]) returns boolean language sql security definer stable set search_path=public as
$$ select exists(select 1 from wajih_profiles where id=auth.uid() and active and role=any(r)) $$;

create or replace function wj_email_for_username(u text) returns text language sql security definer stable set search_path=public,auth as
$$ select a.email from wajih_profiles p join auth.users a on a.id=p.id where p.username=lower(u) and p.active $$;

create or replace function wj_complete_first_login(new_username text) returns void language plpgsql security definer set search_path=public as
$$ begin update wajih_profiles set username=lower(new_username), must_change=false where id=auth.uid(); end $$;

alter table wajih_profiles enable row level security;
alter table portal_data add column if not exists touched boolean not null default false;
alter table portal_data enable row level security;

drop policy if exists p_sel on wajih_profiles;
create policy p_sel on wajih_profiles for select using (id=auth.uid() or wj_is_role(array['inspector','supervisor']));
drop policy if exists p_ins on wajih_profiles;
create policy p_ins on wajih_profiles for insert with check (wj_is_role(array['inspector']));
drop policy if exists p_upd on wajih_profiles;
create policy p_upd on wajih_profiles for update using (wj_is_role(array['inspector']));
drop policy if exists p_del on wajih_profiles;
create policy p_del on wajih_profiles for delete using (wj_is_role(array['inspector']));

drop policy if exists d_sel on portal_data;
create policy d_sel on portal_data for select using (wj_is_role(array['inspector','supervisor']) or (wj_is_role(array['teacher']) and (owner=auth.uid() or shared)));
drop policy if exists d_ins on portal_data;
create policy d_ins on portal_data for insert with check (wj_is_role(array['inspector']) or (wj_is_role(array['supervisor','teacher']) and (owner=auth.uid() or shared)));
drop policy if exists d_upd on portal_data;
create policy d_upd on portal_data for update using (wj_is_role(array['inspector']) or (wj_is_role(array['supervisor','teacher']) and (owner=auth.uid() or shared)));
drop policy if exists d_del on portal_data;
create policy d_del on portal_data for delete using (wj_is_role(array['inspector']) or (wj_is_role(array['supervisor','teacher']) and owner=auth.uid()));

create table if not exists wajih_activity(
  id bigserial primary key, user_id uuid, user_name text, user_role text,
  action text not null check (action in ('create','update','delete')),
  key text, created_at timestamptz default now());
alter table wajih_activity enable row level security;
drop policy if exists a_sel on wajih_activity;
create policy a_sel on wajih_activity for select using (wj_is_role(array['inspector','supervisor']));
drop policy if exists a_ins on wajih_activity;
create policy a_ins on wajih_activity for insert with check (user_id=auth.uid() and wj_is_role(array['inspector','supervisor','teacher']));

create or replace function wj_reset_password(uid uuid, new_pass text) returns void language plpgsql security definer set search_path=public,auth,extensions as $$
begin
  if not wj_is_role(array['inspector']) then raise exception 'غير مصرّح'; end if;
  if length(new_pass)<10 then raise exception 'كلمة المرور قصيرة'; end if;
  update auth.users set encrypted_password=crypt(new_pass,gen_salt('bf')), updated_at=now() where id=uid;
  update wajih_profiles set must_change=true where id=uid;
  delete from auth.sessions where user_id=uid;
end $$;

create or replace function wj_delete_user(uid uuid, wipe boolean) returns void language plpgsql security definer set search_path=public,auth,extensions as $$
begin
  if not wj_is_role(array['inspector']) then raise exception 'غير مصرّح'; end if;
  if uid=auth.uid() then raise exception 'لا يمكن حذف حسابك'; end if;
  if wipe then delete from wajih_prof where user_id=uid; delete from portal_data where owner=uid; delete from wajih_activity where user_id=uid; end if;
  delete from auth.users where id=uid;
end $$;
revoke all on function wj_reset_password(uuid,text) from public;
revoke all on function wj_delete_user(uuid,boolean) from public;
grant execute on function wj_reset_password(uuid,text), wj_delete_user(uuid,boolean) to authenticated;

-- بيانات الأساتذة (data-prof): سجل لكل أستاذ، يعدّله صاحبه، ويرى المفتش والمشرف الكل ويعدّل المفتش وحده
create table if not exists wajih_prof(
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  data jsonb not null default '{}', insp jsonb not null default '{}', tt jsonb not null default '{}',
  photo text, updated_by_name text,
  updated_at timestamptz default now(), created_at timestamptz default now());
alter table wajih_prof enable row level security;
drop policy if exists f_sel on wajih_prof;
create policy f_sel on wajih_prof for select using (user_id=auth.uid() or wj_is_role(array['inspector','supervisor']));
drop policy if exists f_ins on wajih_prof;
create policy f_ins on wajih_prof for insert with check ((user_id=auth.uid() and wj_is_role(array['inspector','supervisor','teacher'])) or wj_is_role(array['inspector']));
drop policy if exists f_upd on wajih_prof;
create policy f_upd on wajih_prof for update using (user_id=auth.uid() or wj_is_role(array['inspector']));
drop policy if exists f_del on wajih_prof;
create policy f_del on wajih_prof for delete using (wj_is_role(array['inspector']));

create or replace function wj_prof_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not wj_is_role(array['inspector']) then
    if tg_op='INSERT' then new.insp:='{}'::jsonb; else new.insp:=old.insp; new.user_id:=old.user_id; end if;
  end if;
  new.updated_at:=now();
  return new;
end $$;
drop trigger if exists wj_prof_guard_t on wajih_prof;
create trigger wj_prof_guard_t before insert or update on wajih_prof for each row execute function wj_prof_guard();

-- التقارير (التقرير التربوي): يحررها المفتش، ويطلع عليها الأستاذ المعني بعد أن يتيحها له، دون تعديل
create table if not exists wajih_reports(
  id uuid primary key default gen_random_uuid(),
  prof_id uuid not null references wajih_prof(id) on delete cascade,
  kind text not null default 'peda',
  data jsonb not null default '{}',
  published boolean not null default false,
  created_by uuid, created_by_name text,
  created_at timestamptz default now(), updated_at timestamptz default now());
alter table wajih_reports enable row level security;
drop policy if exists r_sel on wajih_reports;
create policy r_sel on wajih_reports for select using (
  wj_is_role(array['inspector'])
  or exists(select 1 from wajih_prof p where p.id=wajih_reports.prof_id and p.user_id=auth.uid() and wajih_reports.published)
  or (wj_is_role(array['supervisor']) and not exists(select 1 from wajih_prof p where p.id=wajih_reports.prof_id and p.user_id=auth.uid())));
drop policy if exists r_ins on wajih_reports;
create policy r_ins on wajih_reports for insert with check (wj_is_role(array['inspector']));
drop policy if exists r_upd on wajih_reports;
create policy r_upd on wajih_reports for update using (wj_is_role(array['inspector']));
drop policy if exists r_del on wajih_reports;
create policy r_del on wajih_reports for delete using (wj_is_role(array['inspector']));

revoke all on function wj_email_for_username(text) from public;
grant execute on function wj_email_for_username(text) to anon, authenticated;

-- تحديث ذاكرة واجهة Supabase حتى تُعرَف الجداول الجديدة فوراً
notify pgrst, 'reload schema';

-- ---------------------------------------------------------
-- الخطوة اليدوية: أنشئ أول مفتش
-- 1) Authentication ← Users ← Add user (بريد: أي@wajih-portal.dz + كلمة مرور مؤقتة يختارها المفتش)
-- 2) عدّل البريد أدناه ثم شغّل:
-- insert into wajih_profiles(id,username,full_name,role,must_change)
-- select id,'setup-'||substr(id::text,1,6),'المفتش','inspector',true from auth.users where email='ضع-البريد-هنا';
-- 3) في أول دخول يُجبَر على اختيار اسم مستخدم وكلمة مرور جديدين.
