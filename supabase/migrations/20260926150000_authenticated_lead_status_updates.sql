-- Allow signed-in business users to manage only the status of existing leads.
-- Public lead submission remains governed by its existing INSERT policy.

-- Remove table-level and any previous per-column UPDATE grants first. A
-- table-level UPDATE privilege would otherwise allow changes to every column.
revoke update on table public.leads from authenticated;
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
  assigned_to,
  estimated_value_dkk,
  response_time_hours,
  notes,
  inserted_at
) on table public.leads from authenticated;

grant update (status) on table public.leads to authenticated;

drop policy if exists "Allow authenticated users to update lead status" on public.leads;

create policy "Allow authenticated users to update lead status"
on public.leads
for update
to authenticated
using (true)
with check (true);
