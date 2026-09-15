-- LUNHS v8 additions
-- Run after v7 policies.
drop policy if exists "admin assignment insert" on public.teacher_assignments;
create policy "admin assignment insert" on public.teacher_assignments
for insert to authenticated
with check (public.current_user_role() = 'admin');

grant insert on public.teacher_assignments to authenticated;
grant usage, select on all sequences in schema public to authenticated;
