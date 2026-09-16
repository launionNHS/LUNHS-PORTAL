-- LUNHS v12 Admin Publishing Studio
-- Run ONCE in Supabase SQL Editor. Safe to re-run policies.

alter table public.posts add column if not exists category text;
alter table public.posts add column if not exists media_type text;
alter table public.posts add column if not exists media_url text;
alter table public.posts add column if not exists thumbnail_url text;

alter table public.posts enable row level security;

drop policy if exists "public read published posts" on public.posts;
create policy "public read published posts" on public.posts
for select to anon, authenticated
using (published = true or public.current_user_role() = 'admin');

drop policy if exists "admin insert posts" on public.posts;
create policy "admin insert posts" on public.posts
for insert to authenticated
with check (public.current_user_role() = 'admin' and author_id = auth.uid());

drop policy if exists "admin update posts" on public.posts;
create policy "admin update posts" on public.posts
for update to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "admin delete posts" on public.posts;
create policy "admin delete posts" on public.posts
for delete to authenticated
using (public.current_user_role() = 'admin');

grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
grant usage, select on all sequences in schema public to authenticated;

insert into storage.buckets(id,name,public)
values('school-media','school-media',true)
on conflict(id) do update set public=true;

drop policy if exists "public read school media" on storage.objects;
create policy "public read school media" on storage.objects
for select to public using(bucket_id='school-media');

drop policy if exists "admin upload school media" on storage.objects;
create policy "admin upload school media" on storage.objects
for insert to authenticated
with check(bucket_id='school-media' and public.current_user_role()='admin');

drop policy if exists "admin update school media" on storage.objects;
create policy "admin update school media" on storage.objects
for update to authenticated
using(bucket_id='school-media' and public.current_user_role()='admin')
with check(bucket_id='school-media' and public.current_user_role()='admin');

drop policy if exists "admin delete school media" on storage.objects;
create policy "admin delete school media" on storage.objects
for delete to authenticated
using(bucket_id='school-media' and public.current_user_role()='admin');
