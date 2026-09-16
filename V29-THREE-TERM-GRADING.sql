-- LUNHS v29: Three-Term Grading
alter table public.grades add column if not exists term1 numeric check(term1 between 60 and 100);
alter table public.grades add column if not exists term2 numeric check(term2 between 60 and 100);
alter table public.grades add column if not exists term3 numeric check(term3 between 60 and 100);

-- Preserve existing Q1-Q3 data as Term 1-Term 3 where applicable.
update public.grades
set term1=coalesce(term1,q1),
    term2=coalesce(term2,q2),
    term3=coalesce(term3,q3)
where term1 is null or term2 is null or term3 is null;

grant select,insert,update on public.grades to authenticated;
