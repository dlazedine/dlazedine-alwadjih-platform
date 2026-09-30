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

revoke all on function wj_email_for_username(text) from public;
grant execute on function wj_email_for_username(text) to anon, authenticated;

-- ---------------------------------------------------------
-- الخطوة اليدوية: أنشئ أول مفتش
-- 1) Authentication ← Users ← Add user (بريد: أي@wajih-portal.dz + كلمة مرور مؤقتة يختارها المفتش)
-- 2) عدّل البريد أدناه ثم شغّل:
-- insert into wajih_profiles(id,username,full_name,role,must_change)
-- select id,'setup-'||substr(id::text,1,6),'المفتش','inspector',true from auth.users where email='ضع-البريد-هنا';
-- 3) في أول دخول يُجبَر على اختيار اسم مستخدم وكلمة مرور جديدين.
