-- Allow authenticated dashboard users to update leads while preserving the
-- existing RLS boundary. Anonymous users retain INSERT-only access.
revoke update on table public.leads from public, anon;
revoke update (
  id,
  lead_id,
  created_at,
  customer_name,
  email,
  phone,
  project_type,
  budget_dkk,
  location,
  source,
  status,
  assigned_to,
  estimated_value_dkk,
  response_time_hours,
  notes,
  inserted_at
) on table public.leads from public, anon;
grant update on table public.leads to authenticated;

drop policy if exists "Allow authenticated users to update lead status" on public.leads;

create policy "Allow authenticated users to update lead status"
on public.leads
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

-- The PostgREST update endpoint requires a table UPDATE privilege. Keep that
-- privilege safe by rejecting authenticated changes to every field except
-- status. Other database roles retain their existing behavior.
create or replace function public.guard_authenticated_lead_status_update()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is not null
    and (to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status') then
    raise exception 'Authenticated users may update only lead status'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_authenticated_lead_status_update on public.leads;

create trigger guard_authenticated_lead_status_update
before update on public.leads
for each row
execute function public.guard_authenticated_lead_status_update();
