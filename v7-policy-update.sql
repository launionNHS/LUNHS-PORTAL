-- LUNHS v7 policy repair/additions. Safe to run after the existing schema.
create or replace function public.current_user_role()
returns public.app_role language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() $$;
revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

drop policy if exists "subjects read" on public.subjects;
create policy "subjects read" on public.subjects for select to authenticated using(true);

drop policy if exists "admin subject insert" on public.subjects;
create policy "admin subject insert" on public.subjects for insert to authenticated with check(public.current_user_role()='admin');

drop policy if exists "admin post insert" on public.posts;
create policy "admin post insert" on public.posts for insert to authenticated with check(public.current_user_role()='admin');
drop policy if exists "admin post update" on public.posts;
create policy "admin post update" on public.posts for update to authenticated using(public.current_user_role()='admin') with check(public.current_user_role()='admin');
drop policy if exists "admin post delete" on public.posts;
create policy "admin post delete" on public.posts for delete to authenticated using(public.current_user_role()='admin');

drop policy if exists "assignment read" on public.teacher_assignments;
create policy "assignment read" on public.teacher_assignments for select to authenticated
using(teacher_id=auth.uid() or public.current_user_role()='admin');

drop policy if exists "grade read" on public.grades;
create policy "grade read" on public.grades for select to authenticated
using(student_id=auth.uid() or teacher_id=auth.uid() or public.current_user_role()='admin');

grant usage,select on all sequences in schema public to authenticated;
