-- LUNHS v10.9 Media Hub database upgrade
-- Run once in Supabase SQL Editor.
alter table public.posts add column if not exists category text;
alter table public.posts add column if not exists media_type text check (media_type in ('image','video','youtube'));
alter table public.posts add column if not exists media_url text;
alter table public.posts add column if not exists thumbnail_url text;

-- Public media bucket. Admin uploads can be added from the dashboard in the next publishing form.
insert into storage.buckets (id,name,public)
values ('school-media','school-media',true)
on conflict (id) do update set public=true;

drop policy if exists "public read school media" on storage.objects;
create policy "public read school media"
on storage.objects for select
to public
using (bucket_id='school-media');

drop policy if exists "admin upload school media" on storage.objects;
create policy "admin upload school media"
on storage.objects for insert
to authenticated
with check (
  bucket_id='school-media'
  and public.current_user_role()='admin'
);

drop policy if exists "admin update school media" on storage.objects;
create policy "admin update school media"
on storage.objects for update
to authenticated
using (bucket_id='school-media' and public.current_user_role()='admin')
with check (bucket_id='school-media' and public.current_user_role()='admin');

drop policy if exists "admin delete school media" on storage.objects;
create policy "admin delete school media"
on storage.objects for delete
to authenticated
using (bucket_id='school-media' and public.current_user_role()='admin');
