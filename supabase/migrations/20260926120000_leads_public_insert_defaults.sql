-- Supply server-owned values for public lead inserts.
-- The current highest existing lead_id is LEAD-00981.

create sequence if not exists public.leads_lead_number_seq
  start with 982
  increment by 1;

create or replace function public.set_lead_system_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  new.lead_id := 'LEAD-' || lpad(nextval('public.leads_lead_number_seq')::text, 5, '0');
  new.created_at := now();
  new.status := 'New';
  new.assigned_to := null;
  new.estimated_value_dkk := new.budget_dkk;
  new.response_time_hours := null;

  return new;
end;
$$;

drop trigger if exists set_lead_system_fields_before_insert on public.leads;

create trigger set_lead_system_fields_before_insert
before insert on public.leads
for each row
execute function public.set_lead_system_fields();
