-- LUNHS v9 grade workflow
drop policy if exists "profile access" on public.profiles;
create policy "profile access" on public.profiles for select to authenticated using (
 id=auth.uid() or public.current_user_role()='admin' or
 (public.current_user_role()='teacher' and role='student' and exists
 (select 1 from public.teacher_assignments a where a.teacher_id=auth.uid() and a.section=profiles.section))
);
drop policy if exists "teacher grade insert" on public.grades;
create policy "teacher grade insert" on public.grades for insert to authenticated with check (
 teacher_id=auth.uid() and exists(select 1 from public.teacher_assignments a where a.teacher_id=auth.uid() and a.subject_id=grades.subject_id and a.section=grades.section)
);
drop policy if exists "grade update" on public.grades;
create policy "grade update" on public.grades for update to authenticated
using(teacher_id=auth.uid() or public.current_user_role()='admin')
with check(teacher_id=auth.uid() or public.current_user_role()='admin');
grant select on public.profiles,public.teacher_assignments,public.subjects,public.grades to authenticated;
grant insert,update on public.grades to authenticated;
grant usage,select on all sequences in schema public to authenticated;
