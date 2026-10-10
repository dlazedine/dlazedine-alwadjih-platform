-- تخزين الملفات (نفّذه مرة واحدة في Supabase ← SQL Editor)
-- حدّ الملف الواحد 50 ميغابايت (أقصى حدّ في الخطة المجانية؛ ارفعه من Storage ← Settings إن كانت خطتك تسمح)

insert into storage.buckets (id, name, public, file_size_limit)
values ('portal-files', 'portal-files', false, 52428800)
on conflict (id) do update set file_size_limit = 52428800, public = false;

update storage.buckets set file_size_limit = 52428800 where id = 'exams';

drop policy if exists "portal-files read"   on storage.objects;
drop policy if exists "portal-files insert" on storage.objects;
drop policy if exists "portal-files delete" on storage.objects;

create policy "portal-files read"   on storage.objects for select to authenticated using (bucket_id = 'portal-files');
create policy "portal-files insert" on storage.objects for insert to authenticated with check (bucket_id = 'portal-files');
create policy "portal-files delete" on storage.objects for delete to authenticated using (bucket_id = 'portal-files');

-- حسابات جديدة: تأكد أن الحقل active افتراضه true حتى لا تُرفض عند الدخول
alter table public.wajih_profiles alter column active set default true;
update public.wajih_profiles set active = true where active is null;
